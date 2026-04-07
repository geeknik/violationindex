import type { RuleEvaluationResult } from '@violation-index/shared';

interface EvidenceRow {
  id: string;
  site_domain: string;
  request_destination: string;
  request_type: string;
  observed_at: string;
  session_id: string;
}

/**
 * Rule: gpc_ignored
 *
 * Detects sites that ignore the Global Privacy Control signal.
 * GPC is a legally binding opt-out signal under CCPA/CPRA.
 * If a site receives GPC=1 but still fires marketing/tracker requests,
 * that is a potential violation.
 *
 * Note: In Week 1, the extension doesn't yet tag evidence with GPC state.
 * This rule checks for pre-consent marketing on sites where the browser
 * has GPC enabled (which the content script detects as a consent mechanism).
 * A future extension update will add explicit gpc_active field.
 *
 * For now, this rule produces lower-confidence results that require
 * analyst verification of GPC status.
 */
export async function evaluateGpcIgnored(
  db: D1Database,
): Promise<readonly RuleEvaluationResult[]> {
  // Find pre-consent marketing evidence that may involve GPC
  // This is a placeholder until the extension reports GPC state per-evidence
  const rows = await db
    .prepare(
      `SELECT id, site_domain, request_destination, request_type, observed_at, session_id
       FROM evidence
       WHERE consent_state = 'pre_consent'
         AND request_type IN ('marketing', 'tracker')
         AND status = 'unreviewed'
         AND violation_id IS NULL
       ORDER BY site_domain, observed_at`,
    )
    .all<EvidenceRow>();

  if (rows.results.length === 0) return [];

  // Group by domain
  const byDomain = new Map<string, EvidenceRow[]>();
  for (const row of rows.results) {
    const existing = byDomain.get(row.site_domain);
    if (existing) {
      existing.push(row);
    } else {
      byDomain.set(row.site_domain, [row]);
    }
  }

  const results: RuleEvaluationResult[] = [];

  for (const [domain, evidence] of byDomain) {
    const uniqueSessions = new Set(evidence.map((e) => e.session_id));
    const timestamps = evidence.map((e) => e.observed_at).sort();
    const uniqueDestinations = new Set(evidence.map((e) => e.request_destination));

    // GPC ignored is always at least medium severity — it's a legal signal
    results.push({
      violationType: 'gpc_ignored',
      siteDomain: domain,
      severity: 'medium',
      evidenceIds: evidence.map((e) => e.id),
      sessionCount: uniqueSessions.size,
      firstObserved: timestamps[0]!,
      lastObserved: timestamps[timestamps.length - 1]!,
      confidence: 'medium',
      reason: 'Marketing/tracker requests fired despite potential GPC signal. ' +
        uniqueDestinations.size + ' destinations: ' + Array.from(uniqueDestinations).join(', ') +
        '. Requires analyst verification of GPC status.',
    });
  }

  return results;
}
