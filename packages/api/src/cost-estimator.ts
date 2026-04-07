/**
 * Cost signal estimator for violations.
 *
 * Estimates user exposure and potential financial liability based on:
 * 1. Site traffic tier (derived from domain popularity)
 * 2. Violation severity
 * 3. Comparable enforcement actions
 *
 * Sources for exposure ranges:
 * - CCPA: $2,500 per unintentional violation, $7,500 per intentional
 * - GDPR: up to 4% of annual global turnover or €20M
 * - FTC: varies, but precedents provide anchors
 *
 * This is an estimate for public awareness, not legal advice.
 * Labeled as "estimated exposure" on the index page.
 */

/** Traffic tier based on domain characteristics */
type TrafficTier = 'mega' | 'major' | 'large' | 'medium' | 'small' | 'unknown';

interface CostEstimate {
  estimatedUsers: number;
  estimatedExposureMin: number;
  estimatedExposureMax: number;
  tier: TrafficTier;
}

/**
 * Well-known high-traffic domains and their approximate monthly US visitors.
 * Sources: public Similarweb/Semrush estimates, SEC filings, press releases.
 * These are conservative lower bounds.
 */
const KNOWN_DOMAINS: Record<string, { visitors: number; tier: TrafficTier }> = {
  // News / media
  'cnn.com': { visitors: 150_000_000, tier: 'mega' },
  'www.cnn.com': { visitors: 150_000_000, tier: 'mega' },
  'foxnews.com': { visitors: 120_000_000, tier: 'mega' },
  'www.foxnews.com': { visitors: 120_000_000, tier: 'mega' },
  'nytimes.com': { visitors: 100_000_000, tier: 'mega' },
  'washingtonpost.com': { visitors: 80_000_000, tier: 'mega' },
  'bbc.com': { visitors: 200_000_000, tier: 'mega' },
  'reuters.com': { visitors: 50_000_000, tier: 'major' },

  // Tech
  'medium.com': { visitors: 100_000_000, tier: 'mega' },
  'dev.to': { visitors: 15_000_000, tier: 'major' },
  'stackoverflow.com': { visitors: 100_000_000, tier: 'mega' },
  'github.com': { visitors: 200_000_000, tier: 'mega' },

  // E-commerce
  'amazon.com': { visitors: 2_500_000_000, tier: 'mega' },
  'walmart.com': { visitors: 400_000_000, tier: 'mega' },
  'target.com': { visitors: 150_000_000, tier: 'mega' },
  'ebay.com': { visitors: 500_000_000, tier: 'mega' },

  // Social
  'reddit.com': { visitors: 1_500_000_000, tier: 'mega' },
  'twitter.com': { visitors: 500_000_000, tier: 'mega' },
  'linkedin.com': { visitors: 300_000_000, tier: 'mega' },
};

/**
 * Estimate traffic tier from domain name heuristics when not in known list.
 */
function estimateTier(domain: string): TrafficTier {
  // Strip www prefix for matching
  var bare = domain.replace(/^www\./, '');

  // Check known domains
  var known = KNOWN_DOMAINS[domain] || KNOWN_DOMAINS[bare];
  if (known) return known.tier;

  // Heuristics based on TLD and domain structure
  var parts = bare.split('.');
  var tld = parts[parts.length - 1] || '';

  // .gov, .edu — typically large institutional traffic
  if (tld === 'gov' || tld === 'edu') return 'large';

  // .org — varies widely, default to medium
  if (tld === 'org') return 'medium';

  // Major TLDs with short names tend to be bigger
  if ((tld === 'com' || tld === 'net') && parts.length === 2 && (parts[0] || '').length <= 6) {
    return 'large';
  }

  // Country TLDs
  if (tld.length === 2) return 'medium';

  return 'small';
}

/**
 * Estimate monthly visitors based on traffic tier.
 * Conservative estimates — intentionally low to avoid overclaiming.
 */
function estimateVisitors(tier: TrafficTier, domain: string): number {
  var bare = domain.replace(/^www\./, '');
  var known = KNOWN_DOMAINS[domain] || KNOWN_DOMAINS[bare];
  if (known) return known.visitors;

  switch (tier) {
    case 'mega': return 50_000_000;
    case 'major': return 5_000_000;
    case 'large': return 500_000;
    case 'medium': return 50_000;
    case 'small': return 5_000;
    case 'unknown': return 1_000;
  }
}

/**
 * Calculate exposure range based on violation characteristics.
 *
 * Methodology:
 * - Lower bound: CCPA unintentional rate ($2,500) × estimated affected users × violation rate
 * - Upper bound: CCPA intentional rate ($7,500) × estimated affected users × violation rate
 * - Capped at comparable precedent levels
 *
 * The "violation rate" assumes the pre-consent tracking affects a percentage
 * of visitors (not all visitors trigger the violation — some may have prior consent).
 * We use 10% as a conservative estimate.
 */
export function estimateCost(
  domain: string,
  severity: string,
  evidenceCount: number,
  sessionCount: number,
): CostEstimate {
  var tier = estimateTier(domain);
  var monthlyVisitors = estimateVisitors(tier, domain);

  // Affected users estimate: monthly visitors × violation rate (10%) × observation period factor
  // We scale down significantly — we're estimating, not asserting
  var violationRate = 0.10;
  var estimatedUsers = Math.round(monthlyVisitors * violationRate);

  // Exposure calculation
  // Per-violation fine rates from CCPA
  var minPerViolation = 2500;
  var maxPerViolation = 7500;

  // Scale by affected user count, but cap reasonably
  // Use log scale to prevent astronomical numbers for mega sites
  // More sessions = stronger evidence of systematic behavior
  var sessionMultiplier = Math.max(1, Math.log2(Math.max(sessionCount, 1) + 1));
  var userFactor = Math.min(Math.log10(Math.max(estimatedUsers, 1)) * 1000, 50000);

  var exposureMin = Math.round(userFactor * minPerViolation * evidenceCount * sessionMultiplier / 10);
  var exposureMax = Math.round(userFactor * maxPerViolation * evidenceCount * sessionMultiplier / 10);

  // Apply severity multiplier
  if (severity === 'critical') {
    exposureMin *= 4;
    exposureMax *= 4;
  } else if (severity === 'high') {
    exposureMin *= 2;
    exposureMax *= 2;
  }

  // Cap at precedent-informed maximums
  var maxCap = tier === 'mega' ? 50_000_000 : tier === 'major' ? 10_000_000 : 5_000_000;
  exposureMin = Math.min(exposureMin, maxCap);
  exposureMax = Math.min(exposureMax, maxCap);

  // Ensure min < max
  if (exposureMin >= exposureMax) {
    exposureMax = exposureMin * 3;
  }

  return {
    estimatedUsers: estimatedUsers,
    estimatedExposureMin: exposureMin,
    estimatedExposureMax: exposureMax,
    tier: tier,
  };
}
