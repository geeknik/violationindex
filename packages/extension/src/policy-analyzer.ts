/**
 * Privacy policy claim extractor.
 *
 * Parses plaintext privacy policies to extract structured claims about:
 * - Which trackers/services are disclosed
 * - Cookie usage descriptions
 * - Consent mechanisms described
 * - Data collection practices
 * - Third-party sharing
 * - Opt-out mechanisms
 *
 * These claims are compared against observed tracker behavior to identify
 * contradictions (e.g., undisclosed trackers firing pre-consent).
 */

import type { PolicyClaim } from '@violation-index/shared/types';

/** Known tracker/service patterns to search for in policy text */
var KNOWN_SERVICES: readonly { readonly pattern: RegExp; readonly name: string; readonly category: string }[] = [
  // Google
  { pattern: /google\s*analytics/i, name: 'Google Analytics', category: 'analytics' },
  { pattern: /google\s*tag\s*manager/i, name: 'Google Tag Manager', category: 'analytics' },
  { pattern: /google\s*adsense/i, name: 'Google Adsense', category: 'advertising' },
  { pattern: /google\s*ads?\b/i, name: 'Google Ads', category: 'advertising' },
  { pattern: /doubleclick/i, name: 'Google DoubleClick', category: 'advertising' },
  { pattern: /google\s*ad\s*manager/i, name: 'Google Ad Manager', category: 'advertising' },
  { pattern: /google\s*remarketing/i, name: 'Google Remarketing', category: 'advertising' },
  { pattern: /firebase/i, name: 'Firebase', category: 'analytics' },

  // Meta / Facebook
  { pattern: /facebook\s*pixel/i, name: 'Facebook Pixel', category: 'tracking' },
  { pattern: /facebook\s*(?:ads|advertising)/i, name: 'Facebook Ads', category: 'advertising' },
  { pattern: /meta\s*pixel/i, name: 'Meta Pixel', category: 'tracking' },
  { pattern: /instagram\s*(?:tracking|pixel)/i, name: 'Instagram Tracking', category: 'tracking' },

  // Microsoft
  { pattern: /microsoft\s*clarity/i, name: 'Microsoft Clarity', category: 'analytics' },
  { pattern: /bing\s*(?:ads|UET)/i, name: 'Bing Ads', category: 'advertising' },

  // Ad networks / exchanges
  { pattern: /criteo/i, name: 'Criteo', category: 'advertising' },
  { pattern: /trade\s*desk/i, name: 'The Trade Desk', category: 'advertising' },
  { pattern: /taboola/i, name: 'Taboola', category: 'advertising' },
  { pattern: /outbrain/i, name: 'Outbrain', category: 'advertising' },
  { pattern: /pubmatic/i, name: 'PubMatic', category: 'advertising' },
  { pattern: /appnexus|xandr/i, name: 'Xandr/AppNexus', category: 'advertising' },
  { pattern: /rubicon/i, name: 'Magnite/Rubicon', category: 'advertising' },
  { pattern: /openx/i, name: 'OpenX', category: 'advertising' },
  { pattern: /index\s*exchange/i, name: 'Index Exchange', category: 'advertising' },
  { pattern: /pubgalaxy/i, name: 'PubGalaxy', category: 'advertising' },
  { pattern: /skimlinks/i, name: 'Skimlinks', category: 'advertising' },

  // Analytics / Session recording
  { pattern: /hotjar/i, name: 'Hotjar', category: 'analytics' },
  { pattern: /fullstory/i, name: 'FullStory', category: 'analytics' },
  { pattern: /mixpanel/i, name: 'Mixpanel', category: 'analytics' },
  { pattern: /amplitude/i, name: 'Amplitude', category: 'analytics' },
  { pattern: /segment\.io|segment\.com/i, name: 'Segment', category: 'analytics' },
  { pattern: /heap\s*analytics/i, name: 'Heap', category: 'analytics' },
  { pattern: /new\s*relic/i, name: 'New Relic', category: 'analytics' },
  { pattern: /mouseflow/i, name: 'Mouseflow', category: 'analytics' },
  { pattern: /logrocket/i, name: 'LogRocket', category: 'analytics' },

  // Data / Identity
  { pattern: /liveramp/i, name: 'LiveRamp', category: 'identity' },
  { pattern: /adobe\s*audience/i, name: 'Adobe Audience Manager', category: 'identity' },
  { pattern: /oracle\s*(?:bluekai|data\s*cloud)/i, name: 'Oracle BlueKai', category: 'identity' },
  { pattern: /quantcast/i, name: 'Quantcast', category: 'tracking' },
  { pattern: /scorecard\s*research/i, name: 'Scorecard Research', category: 'tracking' },

  // Social
  { pattern: /linkedin\s*(?:insight|tracking|pixel)/i, name: 'LinkedIn Insight', category: 'tracking' },
  { pattern: /tiktok\s*(?:pixel|analytics)/i, name: 'TikTok Pixel', category: 'tracking' },
  { pattern: /twitter\s*(?:pixel|ads)/i, name: 'X/Twitter Ads', category: 'advertising' },
  { pattern: /pinterest\s*(?:tag|pixel)/i, name: 'Pinterest Tag', category: 'tracking' },
  { pattern: /snapchat\s*(?:pixel|ads)/i, name: 'Snapchat Pixel', category: 'tracking' },

  // CMP / Consent
  { pattern: /onetrust/i, name: 'OneTrust', category: 'consent' },
  { pattern: /cookiebot/i, name: 'Cookiebot', category: 'consent' },
  { pattern: /trustarc/i, name: 'TrustArc', category: 'consent' },
  { pattern: /usercentrics/i, name: 'Usercentrics', category: 'consent' },
  { pattern: /didomi/i, name: 'Didomi', category: 'consent' },

  // Affiliate
  { pattern: /amazon\s*(?:affiliate|associates)/i, name: 'Amazon Associates', category: 'affiliate' },
  { pattern: /shareasale/i, name: 'ShareASale', category: 'affiliate' },
  { pattern: /commission\s*junction|cj\s*affiliate/i, name: 'Commission Junction', category: 'affiliate' },
] as const;

/** Consent-related claim patterns */
var CONSENT_PATTERNS: readonly { readonly pattern: RegExp; readonly claimType: string }[] = [
  { pattern: /(?:we|this site|website)\s+(?:use|uses|utilize|rely on)\s+cookies/i, claimType: 'general_cookie_use' },
  { pattern: /(?:with|after)\s+your\s+consent/i, claimType: 'requires_consent' },
  { pattern: /(?:before|prior to)\s+(?:consent|you\s+agree)/i, claimType: 'pre_consent_mention' },
  { pattern: /(?:essential|necessary|strictly necessary)\s+cookies/i, claimType: 'essential_cookies' },
  { pattern: /(?:functional|preference)\s+cookies/i, claimType: 'functional_cookies' },
  { pattern: /(?:performance|analytics)\s+cookies/i, claimType: 'analytics_cookies' },
  { pattern: /(?:advertising|marketing|targeting)\s+cookies/i, claimType: 'advertising_cookies' },
  { pattern: /opt[- ]?out/i, claimType: 'opt_out_available' },
  { pattern: /do\s+not\s+(?:sell|share)/i, claimType: 'do_not_sell' },
  { pattern: /global\s+privacy\s+control|GPC/i, claimType: 'gpc_mention' },
  { pattern: /legitimate\s+interest/i, claimType: 'legitimate_interest' },
  { pattern: /gdpr|general\s+data\s+protection/i, claimType: 'gdpr_mention' },
  { pattern: /ccpa|california\s+consumer\s+privacy/i, claimType: 'ccpa_mention' },
  { pattern: /(?:we|this site)\s+(?:do not|don't|never)\s+(?:sell|share)\s+(?:your\s+)?(?:personal|data)/i, claimType: 'no_data_sale' },
  { pattern: /(?:we|this site)\s+(?:do not|don't|never)\s+(?:track|monitor)/i, claimType: 'no_tracking_claim' },
  { pattern: /third[- ]?part(?:y|ies)\s+(?:may|can|will)\s+(?:collect|track|set cookies)/i, claimType: 'third_party_tracking' },
] as const;

/**
 * Extract a context window around a regex match (sentence or ~200 chars).
 */
function extractContext(text: string, match: RegExpExecArray, maxLen: number): string {
  var start = Math.max(0, match.index - 100);
  var end = Math.min(text.length, match.index + match[0].length + 100);

  // Try to snap to sentence boundaries
  var beforeText = text.slice(start, match.index);
  var sentenceStart = beforeText.lastIndexOf('. ');
  if (sentenceStart !== -1) {
    start = start + sentenceStart + 2;
  }

  var afterText = text.slice(match.index + match[0].length, end);
  var sentenceEnd = afterText.indexOf('. ');
  if (sentenceEnd !== -1) {
    end = match.index + match[0].length + sentenceEnd + 1;
  }

  var context = text.slice(start, end).trim();
  if (context.length > maxLen) {
    context = context.slice(0, maxLen) + '...';
  }
  return context;
}

/**
 * Attempt to identify the section heading for a position in the text.
 */
function findSection(text: string, position: number): string | null {
  // Look backwards for common section patterns
  var preceding = text.slice(Math.max(0, position - 500), position);
  var headingPatterns = [
    /(?:^|\n\s*)([A-Z][A-Za-z\s]{3,50}(?:Policy|Cookies|Data|Information|Consent|Rights|Parties|Advertising|Analytics|Tracking|Security|Collection|Processing|Sharing))\s*(?:\n|$)/g,
    /(?:^|\n\s*)\d+\.\s*([A-Z][A-Za-z\s]{3,50})\s*(?:\n|$)/g,
  ];

  var lastHeading: string | null = null;
  for (var p = 0; p < headingPatterns.length; p++) {
    var re = headingPatterns[p];
    var m: RegExpExecArray | null = null;
    re.lastIndex = 0;
    while ((m = re.exec(preceding)) !== null) {
      lastHeading = m[1].trim();
    }
  }
  return lastHeading;
}

/**
 * Extract structured claims from a privacy policy plaintext.
 *
 * Returns an array of PolicyClaim objects identifying:
 * - Which trackers/services are explicitly disclosed
 * - Cookie usage descriptions
 * - Consent mechanism claims
 * - Data collection practices
 * - Opt-out availability
 * - Legal basis claims
 */
export function extractPolicyClaims(plaintext: string): PolicyClaim[] {
  var claims: PolicyClaim[] = [];

  // 1. Find disclosed services/trackers
  for (var i = 0; i < KNOWN_SERVICES.length; i++) {
    var service = KNOWN_SERVICES[i];
    var re = new RegExp(service.pattern.source, service.pattern.flags + 'g');
    var match = re.exec(plaintext);
    if (match) {
      var context = extractContext(plaintext, match, 300);
      var section = findSection(plaintext, match.index);
      claims.push({
        category: 'tracker_disclosed',
        subject: service.name,
        claim: context,
        section: section,
      });
    }
  }

  // 2. Find consent and cookie-related claims
  for (var j = 0; j < CONSENT_PATTERNS.length; j++) {
    var cp = CONSENT_PATTERNS[j];
    var cre = new RegExp(cp.pattern.source, cp.pattern.flags + 'g');
    var cmatch = cre.exec(plaintext);
    if (cmatch) {
      var ccontext = extractContext(plaintext, cmatch, 300);
      var csection = findSection(plaintext, cmatch.index);

      var category: PolicyClaim['category'] = 'cookie_usage';
      if (cp.claimType === 'opt_out_available' || cp.claimType === 'do_not_sell' || cp.claimType === 'gpc_mention') {
        category = 'opt_out';
      } else if (cp.claimType === 'requires_consent' || cp.claimType === 'pre_consent_mention' || cp.claimType === 'essential_cookies') {
        category = 'consent_mechanism';
      } else if (cp.claimType === 'gdpr_mention' || cp.claimType === 'ccpa_mention' || cp.claimType === 'legitimate_interest') {
        category = 'legal_basis';
      } else if (cp.claimType === 'no_data_sale' || cp.claimType === 'no_tracking_claim') {
        category = 'data_collection';
      } else if (cp.claimType === 'third_party_tracking') {
        category = 'third_party';
      }

      claims.push({
        category: category,
        subject: null,
        claim: ccontext,
        section: csection,
      });
    }
  }

  return claims;
}

/**
 * Compare extracted policy claims against observed trackers.
 * Returns a list of undisclosed trackers (observed but not mentioned in policy).
 */
export function findUndisclosedTrackers(
  claims: readonly PolicyClaim[],
  observedTrackers: readonly { name: string; destination: string }[],
): PolicyClaim[] {
  var disclosedNames = new Set<string>();
  for (var i = 0; i < claims.length; i++) {
    if (claims[i].category === 'tracker_disclosed' && claims[i].subject) {
      disclosedNames.add(claims[i].subject!.toLowerCase());
    }
  }

  var undisclosed: PolicyClaim[] = [];
  var seen = new Set<string>();

  for (var j = 0; j < observedTrackers.length; j++) {
    var tracker = observedTrackers[j];
    var trackerLower = tracker.name.toLowerCase();

    // Check if any disclosed name matches this tracker
    var isDisclosed = false;
    disclosedNames.forEach(function(disclosed) {
      // Fuzzy match: "Google Analytics" matches "Google Analytics 4"
      if (trackerLower.indexOf(disclosed) !== -1 || disclosed.indexOf(trackerLower) !== -1) {
        isDisclosed = true;
      }
      // Also match parent company: "Google Adsense" covers "Google DoubleClick" — NO.
      // DoubleClick is a separate service that must be independently disclosed.
    });

    if (!isDisclosed && !seen.has(tracker.name)) {
      seen.add(tracker.name);
      undisclosed.push({
        category: 'tracker_undisclosed',
        subject: tracker.name,
        claim: 'Tracker observed at ' + tracker.destination + ' but not disclosed in privacy policy',
        section: null,
      });
    }
  }

  return undisclosed;
}
