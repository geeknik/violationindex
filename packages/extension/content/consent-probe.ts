/**
 * Content script: Detects consent mechanisms (CMPs) in the page DOM.
 * Injected at document_start to catch the earliest consent state.
 *
 * Detection strategy (ordered by reliability):
 * 1. TCF v2 API (__tcfapi) — captures actual consent string
 * 2. GPC signal (navigator.globalPrivacyControl)
 * 3. Known CMP DOM selectors (OneTrust, Cookiebot, TrustArc, Didomi, etc.)
 * 4. Generic consent banner heuristic
 * 5. No mechanism detected
 *
 * Evidence hardening:
 * - TCF consent string captured at detection time (proves no consent existed)
 * - GPC state explicitly reported per page load
 * - Consent mechanism type and CMP name recorded for chain of custody
 */

type ConsentState = 'pre_consent' | 'post_consent' | 'no_mechanism';
type ConsentMechanism = 'tcf' | 'gpc' | 'cmp_dom' | 'generic_banner' | 'none';

interface ConsentStatus {
  detected: boolean;
  mechanism: ConsentMechanism;
  cmpName: string | null;
  consentState: ConsentState;
  gpcActive: boolean;
  tcfConsentString: string | null;
  tcfPurposeConsents: string | null;
  detectedAt: number | null;
}

/** Known CMP selectors and their names */
var KNOWN_CMPS = [
  { name: 'OneTrust', selector: '#onetrust-consent-sdk' },
  { name: 'Cookiebot', selector: '#CybotCookiebotDialog' },
  { name: 'TrustArc', selector: '#truste-consent-track' },
  { name: 'Didomi', selector: '#didomi-host' },
  { name: 'Quantcast', selector: '.qc-cmp2-container' },
  { name: 'Osano', selector: '.osano-cm-window' },
  { name: 'Usercentrics', selector: '#usercentrics-root' },
  { name: 'CookieYes', selector: '.cky-consent-container' },
  { name: 'Termly', selector: '#termly-code-snippet-support' },
  { name: 'Axeptio', selector: '#axeptio_overlay' },
  { name: 'Iubenda', selector: '#iubenda-cs-banner' },
  { name: 'Complianz', selector: '.cmplz-cookiebanner' },
  { name: 'CookieFirst', selector: '.cookiefirst-root' },
  { name: 'ConsentManager', selector: '#cmpbox' },
  { name: 'LiveRamp', selector: '#_evidon_banner' },
] as const;

/** Words that suggest a consent banner */
var CONSENT_KEYWORDS = [
  'cookie', 'consent', 'privacy', 'gdpr', 'accept all',
  'reject all', 'manage preferences', 'do not sell',
  'we use cookies', 'cookie policy', 'cookie settings',
  'data protection', 'your privacy',
] as const;

var currentStatus: ConsentStatus = {
  detected: false,
  mechanism: 'none',
  cmpName: null,
  consentState: 'pre_consent',
  gpcActive: false,
  tcfConsentString: null,
  tcfPurposeConsents: null,
  detectedAt: null,
};

var detectionComplete = false;

/** Check for GPC — always runs regardless of other mechanisms */
function detectGpc(): void {
  var nav = navigator as unknown as Record<string, unknown>;
  currentStatus.gpcActive = nav['globalPrivacyControl'] === true;
}

/** Check for TCF v2 API and capture consent string */
function checkTcfApi(): boolean {
  var win = window as unknown as Record<string, unknown>;
  if (typeof win['__tcfapi'] !== 'function') return false;

  currentStatus.detected = true;
  currentStatus.mechanism = 'tcf';
  currentStatus.cmpName = 'TCF v2';
  currentStatus.consentState = 'pre_consent';
  currentStatus.detectedAt = Date.now();

  try {
    // Get current TCF data — this captures the consent string at detection time
    (win['__tcfapi'] as Function)('getTCData', 2, function(tcData: Record<string, unknown>, success: boolean) {
      if (success && tcData) {
        // tcString is the IAB TC string — empty or null means no consent given
        currentStatus.tcfConsentString = (tcData['tcString'] as string) || null;

        // purpose.consents is a bitmask of consented purposes
        var purpose = tcData['purpose'] as Record<string, unknown> | undefined;
        if (purpose && purpose['consents']) {
          currentStatus.tcfPurposeConsents = JSON.stringify(purpose['consents']);
        }

        // gdprApplies tells us if GDPR is relevant
        var gdprApplies = tcData['gdprApplies'];
        if (gdprApplies === true) {
          // GDPR applies — if tcString is empty, no consent has been given
          if (!currentStatus.tcfConsentString) {
            currentStatus.consentState = 'pre_consent';
          }
        }

        notifyBackground();
      }
    });

    // Listen for consent changes
    (win['__tcfapi'] as Function)('addEventListener', 2, function(tcData: Record<string, unknown>) {
      if (tcData['eventStatus'] === 'useractioncomplete') {
        currentStatus.consentState = 'post_consent';
        currentStatus.tcfConsentString = (tcData['tcString'] as string) || null;
        var purpose = tcData['purpose'] as Record<string, unknown> | undefined;
        if (purpose && purpose['consents']) {
          currentStatus.tcfPurposeConsents = JSON.stringify(purpose['consents']);
        }
        notifyBackground();
      }
    });
  } catch (e) {
    // TCF API call failed — still detected, just can't get string
  }

  return true;
}

/** Check for GPC as primary mechanism (when no CMP found) */
function checkGpcAsMechanism(): boolean {
  if (currentStatus.gpcActive) {
    currentStatus.detected = true;
    currentStatus.mechanism = 'gpc';
    currentStatus.cmpName = null;
    currentStatus.consentState = 'pre_consent';
    currentStatus.detectedAt = Date.now();
    return true;
  }
  return false;
}

/** Check for known CMP DOM elements */
function checkKnownCmps(): boolean {
  for (var i = 0; i < KNOWN_CMPS.length; i++) {
    var cmp = KNOWN_CMPS[i];
    var element = document.querySelector(cmp.selector);
    if (element) {
      currentStatus.detected = true;
      currentStatus.mechanism = 'cmp_dom';
      currentStatus.cmpName = cmp.name;
      currentStatus.consentState = 'pre_consent';
      currentStatus.detectedAt = Date.now();

      observeCmpDismissal(element, cmp.selector);
      return true;
    }
  }
  return false;
}

/** Check for generic consent banners via text content */
function checkGenericBanner(): boolean {
  var candidates = document.querySelectorAll(
    '[role="dialog"], [role="banner"], [class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"], [class*="gdpr"], [id*="gdpr"]'
  );

  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    var text = (el.textContent || '').toLowerCase();
    var matchCount = 0;
    for (var j = 0; j < CONSENT_KEYWORDS.length; j++) {
      if (text.indexOf(CONSENT_KEYWORDS[j]) !== -1) matchCount++;
    }

    if (matchCount >= 2) {
      currentStatus.detected = true;
      currentStatus.mechanism = 'generic_banner';
      currentStatus.cmpName = null;
      currentStatus.consentState = 'pre_consent';
      currentStatus.detectedAt = Date.now();

      observeCmpDismissal(el, null);
      return true;
    }
  }
  return false;
}

/** Watch for consent banner dismissal (user interaction) */
function observeCmpDismissal(element: Element, selector: string | null): void {
  var observer = new MutationObserver(function() {
    var stillVisible = selector
      ? document.querySelector(selector) !== null
      : document.contains(element);

    if (!stillVisible || isHidden(element)) {
      currentStatus.consentState = 'post_consent';
      notifyBackground();
      observer.disconnect();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });
  }

  element.addEventListener('click', function(e) {
    var target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button')) {
      setTimeout(function() {
        currentStatus.consentState = 'post_consent';
        notifyBackground();
        observer.disconnect();
      }, 100);
    }
  });
}

/** Check if an element is visually hidden */
function isHidden(el: Element): boolean {
  var style = window.getComputedStyle(el);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    (el as HTMLElement).hidden === true
  );
}

/** Send consent state to background script */
function notifyBackground(): void {
  browser.runtime.sendMessage({
    type: 'consentStateUpdate',
    consentState: currentStatus.consentState,
    mechanism: currentStatus.mechanism,
    cmpName: currentStatus.cmpName,
    gpcActive: currentStatus.gpcActive,
    tcfConsentString: currentStatus.tcfConsentString,
    tcfPurposeConsents: currentStatus.tcfPurposeConsents,
    detectedAt: currentStatus.detectedAt,
  }).catch(function() {
    // Extension context may be invalidated
  });
}

/** Run all detection checks in order */
function runDetection(): void {
  if (detectionComplete) return;

  // Always check GPC first — it's independent of CMPs
  detectGpc();

  if (checkTcfApi() || checkGpcAsMechanism() || checkKnownCmps() || checkGenericBanner()) {
    detectionComplete = true;
    notifyBackground();
    return;
  }
}

/** No mechanism found after timeout */
function finalizeDetection(): void {
  if (detectionComplete) return;
  detectionComplete = true;

  currentStatus.detected = false;
  currentStatus.mechanism = 'none';
  currentStatus.cmpName = null;
  currentStatus.consentState = 'no_mechanism';
  notifyBackground();
}

// Run detection immediately (document_start)
runDetection();

// Re-run after DOM is interactive
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    runDetection();
    if (!detectionComplete) {
      setTimeout(finalizeDetection, 3000);
    }
  });
} else {
  if (!detectionComplete) {
    setTimeout(finalizeDetection, 3000);
  }
}

// Also check after full page load (some CMPs are very lazy)
window.addEventListener('load', function() {
  if (!detectionComplete) {
    runDetection();
    if (!detectionComplete) {
      setTimeout(finalizeDetection, 2000);
    }
  }
});
