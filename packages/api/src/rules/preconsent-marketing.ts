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
 * Rule: preconsent_marketing_transfer
 *
 * Detects sites that transfer data to marketing/tracker third parties
 * before the user has interacted with any consent mechanism.
 *
 * Severity:
 * - HIGH: 3+ unique tracker destinations in a single session
 * - MEDIUM: 1-2 unique tracker destinations
 */
export async function evaluatePreconsentMarketing(
  db: D1Database,
): Promise<readonly RuleEvaluationResult[]> {
  // Find unreviewed pre-consent marketing/tracker evidence, grouped by domain
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
    const uniqueDestinations = new Set(evidence.map((e) => e.request_destination));
    const uniqueSessions = new Set(evidence.map((e) => e.session_id));
    const timestamps = evidence.map((e) => e.observed_at).sort();

    const severity = uniqueDestinations.size >= 3 ? 'high' as const : 'medium' as const;
    const confidence = uniqueDestinations.size >= 3 ? 'high' as const : 'medium' as const;

    results.push({
      violationType: 'preconsent_marketing_transfer',
      siteDomain: domain,
      severity,
      evidenceIds: evidence.map((e) => e.id),
      sessionCount: uniqueSessions.size,
      firstObserved: timestamps[0]!,
      lastObserved: timestamps[timestamps.length - 1]!,
      confidence,
      reason: uniqueDestinations.size + ' marketing/tracker destinations contacted before consent: ' +
        Array.from(uniqueDestinations).join(', '),
    });
  }

  return results;
}
