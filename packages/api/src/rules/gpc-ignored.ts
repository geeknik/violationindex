import type { RuleEvaluationResult } from '@violation-index/shared';
import { GPC_MANDATED_STATES, getGpcMandateSummary } from '@violation-index/shared/jurisdiction';

interface EvidenceRow {
  id: string;
  site_domain: string;
  request_destination: string;
  request_type: string;
  observed_at: string;
  session_id: string;
  gpc_active: number;
}

/**
 * Rule: gpc_ignored
 *
 * Detects sites that ignore the Global Privacy Control signal.
 * GPC is legally binding in 8 states: CA, CO, CT, OR, MT, DE, NE, NJ, MN, MD.
 *
 * Evidence: extension records gpc_active=1 per evidence row.
 * If gpc_active=1 AND marketing/tracker requests still fire,
 * that is a per-user violation in every GPC-mandated jurisdiction.
 *
 * Severity escalation:
 * - HIGH if gpc_active confirmed AND 3+ tracker destinations
 * - MEDIUM if gpc_active confirmed AND <3 destinations
 * - MEDIUM if gpc_active not confirmed (requires analyst verification)
 */
export async function evaluateGpcIgnored(
  db: D1Database,
): Promise<readonly RuleEvaluationResult[]> {
  // Find pre-consent marketing evidence where GPC was active
  const rows = await db
    .prepare(
      `SELECT id, site_domain, request_destination, request_type, observed_at, session_id, gpc_active
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
    const gpcConfirmed = evidence.some((e) => e.gpc_active === 1);

    // Determine severity based on GPC confirmation and destination count
    const severity = gpcConfirmed && uniqueDestinations.size >= 3 ? 'high' as const : 'medium' as const;
    const confidence = gpcConfirmed ? 'high' as const : 'medium' as const;

    // Build reason with legal citations
    const legalCitation = gpcConfirmed
      ? 'GPC signal was active (confirmed by extension). This constitutes a per-user violation in ' +
        GPC_MANDATED_STATES.length + ' states (' + GPC_MANDATED_STATES.join(', ') + '). '
      : 'GPC signal status requires analyst verification. If confirmed, ';

    results.push({
      violationType: 'gpc_ignored',
      siteDomain: domain,
      severity: severity,
      evidenceIds: evidence.map((e) => e.id),
      sessionCount: uniqueSessions.size,
      firstObserved: timestamps[0]!,
      lastObserved: timestamps[timestamps.length - 1]!,
      confidence: confidence,
      reason: legalCitation +
        uniqueDestinations.size + ' tracker destinations fired despite opt-out: ' +
        Array.from(uniqueDestinations).join(', ') + '. ' +
        getGpcMandateSummary(),
    });
  }

  return results;
}
