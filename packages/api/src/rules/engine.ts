import type { RuleEvaluationResult } from '@violation-index/shared';
import { evaluatePreconsentMarketing } from './preconsent-marketing.js';
import { evaluateGpcIgnored } from './gpc-ignored.js';

/**
 * Contradiction engine: runs all rules against unreviewed evidence.
 *
 * Architecture from DESIGN.md section 6:
 * Observation → Rule → Confidence → Human Review → Confirmed
 *
 * This engine produces candidates. Nothing is published without human review.
 */
export async function evaluateAllRules(
  db: D1Database,
): Promise<readonly RuleEvaluationResult[]> {
  const results: RuleEvaluationResult[] = [];

  // Rule 1: Pre-consent marketing transfer
  const preconsentResults = await evaluatePreconsentMarketing(db);
  results.push(...preconsentResults);

  // Rule 2: GPC ignored (lower confidence until extension reports GPC state)
  // Only run if preconsent rule didn't already flag the same domains
  const preconsentDomains = new Set(preconsentResults.map((r) => r.siteDomain));
  const gpcResults = await evaluateGpcIgnored(db);
  for (const result of gpcResults) {
    if (!preconsentDomains.has(result.siteDomain)) {
      results.push(result);
    }
  }

  return results;
}
