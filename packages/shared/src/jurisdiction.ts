/**
 * US State Privacy Law Jurisdiction Module
 *
 * Maps all 20 comprehensive state privacy laws (as of April 2026)
 * to their enforcement parameters: fine ranges, GPC mandates,
 * cure periods, sensitive data rules, and applicable statutes.
 *
 * Used by:
 * - Cost estimator: multi-state fine calculations
 * - Rules engine: GPC-ignored violations cite correct mandates
 * - Distribution engine: regulator packets reference correct statutes
 */

export interface StatePrivacyLaw {
  /** State abbreviation */
  readonly state: string;
  /** Full state name */
  readonly stateName: string;
  /** Law name abbreviation */
  readonly lawAbbreviation: string;
  /** Full law name */
  readonly lawName: string;
  /** Effective date (ISO 8601) */
  readonly effectiveDate: string;
  /** Fine per unintentional violation (USD) — null if not specified */
  readonly finePerViolation: number | null;
  /** Fine per intentional violation (USD) — null if not specified */
  readonly finePerIntentionalViolation: number | null;
  /** Maximum aggregate fine — null if no cap */
  readonly maxAggregateFine: number | null;
  /** Cure period in days — null if none */
  readonly curePeriodDays: number | null;
  /** Whether cure period has a sunset date */
  readonly curePeriodSunset: string | null;
  /** Whether GPC/universal opt-out signal must be honored */
  readonly gpcMandated: boolean;
  /** Whether opt-in is required for sensitive data */
  readonly sensitiveDataOptIn: boolean;
  /** Whether targeted advertising opt-out is available */
  readonly targetedAdOptOut: boolean;
  /** Enforcing authority */
  readonly enforcementAuthority: string;
  /** Whether private right of action exists */
  readonly privateRightOfAction: boolean;
  /** Consumer threshold to trigger applicability */
  readonly consumerThreshold: number | null;
  /** Revenue threshold to trigger applicability */
  readonly revenueThreshold: string | null;
  /** Additional notes */
  readonly notes: string | null;
}

/**
 * All 20 US state comprehensive privacy laws as of April 2026.
 * Ordered by effective date.
 */
export const US_STATE_PRIVACY_LAWS: readonly StatePrivacyLaw[] = [
  {
    state: 'CA',
    stateName: 'California',
    lawAbbreviation: 'CCPA/CPRA',
    lawName: 'California Consumer Privacy Act / California Privacy Rights Act',
    effectiveDate: '2020-01-01',
    finePerViolation: 2500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 30,
    curePeriodSunset: null,
    gpcMandated: true,
    sensitiveDataOptIn: false, // Uses limit-use model
    targetedAdOptOut: true,
    enforcementAuthority: 'California AG + CPPA',
    privateRightOfAction: true,
    consumerThreshold: 100000,
    revenueThreshold: '>$25M gross annual revenue OR >50% revenue from data sales',
    notes: 'Only state with dedicated privacy agency (CPPA). PRA limited to data breaches. Applies to HR and B2B data.',
  },
  {
    state: 'VA',
    stateName: 'Virginia',
    lawAbbreviation: 'VCDPA',
    lawName: 'Virginia Consumer Data Protection Act',
    effectiveDate: '2023-01-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: null,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Virginia AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: '>50% revenue + 25,000 consumers',
    notes: 'Template for most subsequent state laws (Virginia/Washington approach).',
  },
  {
    state: 'CO',
    stateName: 'Colorado',
    lawAbbreviation: 'CPA',
    lawName: 'Colorado Privacy Act',
    effectiveDate: '2023-07-01',
    finePerViolation: 20000,
    finePerIntentionalViolation: 20000,
    maxAggregateFine: 500000,
    curePeriodDays: null, // Expired Jan 1, 2025
    curePeriodSunset: '2025-01-01',
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Colorado AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: 'Revenue/discount from sales + 25,000 consumers',
    notes: '$20,000 per violation, $500K max for related violations.',
  },
  {
    state: 'CT',
    stateName: 'Connecticut',
    lawAbbreviation: 'CTDPA',
    lawName: 'Connecticut Data Privacy Act',
    effectiveDate: '2023-07-01',
    finePerViolation: 5000,
    finePerIntentionalViolation: 5000,
    maxAggregateFine: null,
    curePeriodDays: null, // Expired Jan 1, 2025
    curePeriodSunset: '2025-01-01',
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Connecticut AG',
    privateRightOfAction: false,
    consumerThreshold: 100000, // Drops to 35,000 in Jul 2026
    revenueThreshold: null,
    notes: 'Consumer threshold drops to 35,000 in July 2026.',
  },
  {
    state: 'UT',
    stateName: 'Utah',
    lawAbbreviation: 'UCPA',
    lawName: 'Utah Consumer Privacy Act',
    effectiveDate: '2023-12-31',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: null,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: false,
    targetedAdOptOut: false,
    enforcementAuthority: 'Utah AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: '>$25M revenue AND >50% revenue + 25,000 consumers',
    notes: 'Most business-friendly law. No targeted ad opt-out. No sensitive data opt-in.',
  },
  {
    state: 'TX',
    stateName: 'Texas',
    lawAbbreviation: 'TDPSA',
    lawName: 'Texas Data Privacy and Security Act',
    effectiveDate: '2024-07-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 25000,
    maxAggregateFine: null,
    curePeriodDays: 30,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Texas AG',
    privateRightOfAction: false,
    consumerThreshold: 50000,
    revenueThreshold: '25,000 consumers for sale purposes',
    notes: 'Applies to non-small businesses. Lower consumer threshold than most states.',
  },
  {
    state: 'FL',
    stateName: 'Florida',
    lawAbbreviation: 'FDBR',
    lawName: 'Florida Digital Bill of Rights',
    effectiveDate: '2024-07-01',
    finePerViolation: 50000,
    finePerIntentionalViolation: 50000,
    maxAggregateFine: null,
    curePeriodDays: 45,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Florida AG',
    privateRightOfAction: false,
    consumerThreshold: null,
    revenueThreshold: '>$1B global annual revenue AND >50% from online ads',
    notes: 'Big Tech-only law. $1B revenue floor. Highest per-violation fine at $50K.',
  },
  {
    state: 'OR',
    stateName: 'Oregon',
    lawAbbreviation: 'OCDPA',
    lawName: 'Oregon Consumer Data Privacy Act',
    effectiveDate: '2024-07-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: null, // Expired
    curePeriodSunset: null,
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Oregon AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: '>25% revenue + 25,000 consumers',
    notes: 'Only state that includes nonprofits in scope.',
  },
  {
    state: 'MT',
    stateName: 'Montana',
    lawAbbreviation: 'MCDPA',
    lawName: 'Montana Consumer Data Privacy Act',
    effectiveDate: '2024-10-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 60,
    curePeriodSunset: null,
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Montana AG',
    privateRightOfAction: false,
    consumerThreshold: 25000,
    revenueThreshold: '>25% revenue + 25,000 consumers',
    notes: 'Lowest consumer threshold at 25,000.',
  },
  {
    state: 'DE',
    stateName: 'Delaware',
    lawAbbreviation: 'DPDPA',
    lawName: 'Delaware Personal Data Privacy Act',
    effectiveDate: '2025-01-01',
    finePerViolation: 10000,
    finePerIntentionalViolation: 10000,
    maxAggregateFine: null,
    curePeriodDays: 60,
    curePeriodSunset: '2025-12-31',
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Delaware AG',
    privateRightOfAction: false,
    consumerThreshold: 35000,
    revenueThreshold: '>20% revenue + 10,000 consumers',
    notes: 'Cure period expires Dec 31, 2025.',
  },
  {
    state: 'IA',
    stateName: 'Iowa',
    lawAbbreviation: 'ICDPA',
    lawName: 'Iowa Consumer Data Protection Act',
    effectiveDate: '2025-01-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 90,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: false,
    targetedAdOptOut: false,
    enforcementAuthority: 'Iowa AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: '>50% revenue + 25,000 consumers',
    notes: 'No correction right. No targeted ad opt-out. 90-day cure period (permanent). Most business-friendly after Utah.',
  },
  {
    state: 'NE',
    stateName: 'Nebraska',
    lawAbbreviation: 'NDPA',
    lawName: 'Nebraska Data Privacy Act',
    effectiveDate: '2025-01-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 30,
    curePeriodSunset: null,
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Nebraska AG',
    privateRightOfAction: false,
    consumerThreshold: null,
    revenueThreshold: 'All non-small businesses (SBA definition)',
    notes: 'Broadest threshold in the US — applies to any non-small business processing NE data.',
  },
  {
    state: 'NH',
    stateName: 'New Hampshire',
    lawAbbreviation: 'NHPA',
    lawName: 'New Hampshire Expectation of Privacy Act',
    effectiveDate: '2025-01-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 60,
    curePeriodSunset: '2025-12-31',
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'New Hampshire AG',
    privateRightOfAction: false,
    consumerThreshold: 35000,
    revenueThreshold: '>25% revenue + 10,000 consumers',
    notes: null,
  },
  {
    state: 'NJ',
    stateName: 'New Jersey',
    lawAbbreviation: 'NJDPA',
    lawName: 'New Jersey Data Protection Act',
    effectiveDate: '2025-01-15',
    finePerViolation: 10000,
    finePerIntentionalViolation: 20000,
    maxAggregateFine: null,
    curePeriodDays: 30,
    curePeriodSunset: '2026-07-15',
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'New Jersey AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: 'Any revenue from sales + 25,000 consumers',
    notes: 'Cure period expires Jul 15, 2026.',
  },
  {
    state: 'TN',
    stateName: 'Tennessee',
    lawAbbreviation: 'TIPA',
    lawName: 'Tennessee Information Protection Act',
    effectiveDate: '2025-07-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 15000,
    maxAggregateFine: null,
    curePeriodDays: 60,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Tennessee AG',
    privateRightOfAction: false,
    consumerThreshold: 175000,
    revenueThreshold: '>$25M annual revenue AND >50% revenue + 25,000 consumers',
    notes: 'Most restrictive threshold. Requires both $25M revenue AND high data volume.',
  },
  {
    state: 'MN',
    stateName: 'Minnesota',
    lawAbbreviation: 'MNCDPA',
    lawName: 'Minnesota Consumer Data Privacy Act',
    effectiveDate: '2025-07-31',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 30,
    curePeriodSunset: null,
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Minnesota AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: '>25% revenue + 25,000 consumers',
    notes: 'Unique: right to know specific third-party recipients. Right to contest profiling decisions.',
  },
  {
    state: 'MD',
    stateName: 'Maryland',
    lawAbbreviation: 'MODPA',
    lawName: 'Maryland Online Data Privacy Act',
    effectiveDate: '2025-10-01',
    finePerViolation: 10000,
    finePerIntentionalViolation: 25000,
    maxAggregateFine: null,
    curePeriodDays: 60,
    curePeriodSunset: null,
    gpcMandated: true,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Maryland AG',
    privateRightOfAction: false,
    consumerThreshold: 35000,
    revenueThreshold: '>20% revenue + 10,000 consumers',
    notes: 'Includes financial info as sensitive data. Includes nonprofits.',
  },
  {
    state: 'IN',
    stateName: 'Indiana',
    lawAbbreviation: 'INCDPA',
    lawName: 'Indiana Consumer Data Protection Act',
    effectiveDate: '2026-01-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 30,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Indiana AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: '>50% revenue + 25,000 consumers',
    notes: null,
  },
  {
    state: 'KY',
    stateName: 'Kentucky',
    lawAbbreviation: 'KCDPA',
    lawName: 'Kentucky Consumer Data Protection Act',
    effectiveDate: '2026-01-01',
    finePerViolation: 7500,
    finePerIntentionalViolation: 7500,
    maxAggregateFine: null,
    curePeriodDays: 30,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Kentucky AG',
    privateRightOfAction: false,
    consumerThreshold: 100000,
    revenueThreshold: '>50% revenue + 25,000 consumers',
    notes: 'Permanent 30-day cure period.',
  },
  {
    state: 'RI',
    stateName: 'Rhode Island',
    lawAbbreviation: 'RIDTPPA',
    lawName: 'Rhode Island Data Transparency & Privacy Protection Act',
    effectiveDate: '2026-01-01',
    finePerViolation: 10000,
    finePerIntentionalViolation: 10000,
    maxAggregateFine: null,
    curePeriodDays: null,
    curePeriodSunset: null,
    gpcMandated: false,
    sensitiveDataOptIn: true,
    targetedAdOptOut: true,
    enforcementAuthority: 'Rhode Island AG',
    privateRightOfAction: false,
    consumerThreshold: 35000,
    revenueThreshold: '>20% revenue + 10,000 consumers',
    notes: 'No cure period — strictest enforcement immediacy among 2026 newcomers.',
  },
] as const;

/** States that legally mandate honoring GPC/universal opt-out signals */
export const GPC_MANDATED_STATES: readonly string[] = US_STATE_PRIVACY_LAWS
  .filter((law) => law.gpcMandated)
  .map((law) => law.state);

/** Lookup a state law by abbreviation */
export function getStateLaw(stateCode: string): StatePrivacyLaw | null {
  return US_STATE_PRIVACY_LAWS.find((law) => law.state === stateCode) ?? null;
}

/** Get all applicable laws for a given violation type */
export function getApplicableLaws(violationType: 'preconsent_marketing_transfer' | 'gpc_ignored'): readonly StatePrivacyLaw[] {
  if (violationType === 'gpc_ignored') {
    // Only states that mandate GPC compliance
    return US_STATE_PRIVACY_LAWS.filter((law) => law.gpcMandated);
  }
  // Pre-consent marketing applies broadly — any state with targeted ad opt-out
  return US_STATE_PRIVACY_LAWS.filter((law) => law.targetedAdOptOut);
}

/**
 * Estimate the fine range for a violation across all applicable jurisdictions.
 * Returns { min, max } based on per-violation fines × estimated affected users.
 *
 * Conservative: uses unintentional fine rate.
 * Upper bound: uses intentional fine rate.
 */
export function estimateMultiStateFines(
  violationType: 'preconsent_marketing_transfer' | 'gpc_ignored',
  estimatedAffectedUsers: number,
): { readonly minFine: number; readonly maxFine: number; readonly applicableStates: readonly string[] } {
  var laws = getApplicableLaws(violationType);
  var totalMin = 0;
  var totalMax = 0;
  var states: string[] = [];

  for (var i = 0; i < laws.length; i++) {
    var law = laws[i];
    if (!law) continue;
    var stateFineMin = law.finePerViolation ?? 7500;
    var stateFineMax = law.finePerIntentionalViolation ?? stateFineMin;

    // Rough estimate: 1/50th of affected users per state (proportional distribution)
    // This is deliberately conservative — actual exposure depends on user geolocation
    var stateUsers = Math.max(1, Math.floor(estimatedAffectedUsers / 50));

    var stateMin = stateFineMin * stateUsers;
    var stateMax = stateFineMax * stateUsers;

    // Apply aggregate cap if exists
    if (law.maxAggregateFine !== null) {
      stateMin = Math.min(stateMin, law.maxAggregateFine);
      stateMax = Math.min(stateMax, law.maxAggregateFine);
    }

    totalMin += stateMin;
    totalMax += stateMax;
    states.push(law.state);
  }

  return {
    minFine: totalMin,
    maxFine: totalMax,
    applicableStates: states,
  };
}

/**
 * Format a legal citation for a state's privacy law.
 */
export function formatLawCitation(stateCode: string): string {
  var law = getStateLaw(stateCode);
  if (!law) return 'Unknown state: ' + stateCode;
  return law.lawName + ' (' + law.lawAbbreviation + '), effective ' + law.effectiveDate;
}

/**
 * Get the GPC mandate summary for use in violation reports.
 */
export function getGpcMandateSummary(): string {
  var states = US_STATE_PRIVACY_LAWS.filter((law) => law.gpcMandated);
  var names = states.map((law) => law.stateName + ' (' + law.lawAbbreviation + ')');
  return 'GPC/universal opt-out signals are legally mandated in ' + states.length +
    ' states: ' + names.join(', ') + '. Ignoring GPC constitutes a per-user violation in each jurisdiction.';
}
