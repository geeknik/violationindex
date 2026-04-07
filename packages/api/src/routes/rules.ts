import { Hono } from 'hono';
import type { AppEnv } from '../index.js';
import { analystAuth } from '../middleware/analyst-auth.js';
import { ipRestrict } from '../middleware/ip-restrict.js';
import { evaluateAllRules } from '../rules/engine.js';
import { generateId } from '../db/queries.js';
import { appendAuditEntry } from '../audit-log.js';
import { estimateCost } from '../cost-estimator.js';

export const rulesRoute = new Hono<AppEnv>();

rulesRoute.post('/rules/evaluate', ipRestrict(), analystAuth(), async (c) => {
  var db = c.env.DB;
  var candidates = await evaluateAllRules(db);

  if (candidates.length === 0) {
    return c.json({ candidates: [], created: 0 });
  }

  var created = 0;
  var violations = [];

  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i]!;

    var existing = await db
      .prepare('SELECT id FROM violations WHERE site_domain = ? AND violation_type = ?')
      .bind(candidate.siteDomain, candidate.violationType)
      .first<{ id: string }>();

    // Estimate cost for this violation
    var cost = estimateCost(
      candidate.siteDomain,
      candidate.severity,
      candidate.evidenceIds.length,
      candidate.sessionCount,
    );

    if (existing) {
      await db
        .prepare(
          `UPDATE violations SET
            evidence_count = ?,
            session_count = ?,
            last_observed = ?,
            estimated_users = ?,
            estimated_exposure_min = ?,
            estimated_exposure_max = ?,
            updated_at = datetime('now')
          WHERE id = ?`,
        )
        .bind(
          candidate.evidenceIds.length,
          candidate.sessionCount,
          candidate.lastObserved,
          cost.estimatedUsers,
          cost.estimatedExposureMin,
          cost.estimatedExposureMax,
          existing.id,
        )
        .run();

      for (var j = 0; j < candidate.evidenceIds.length; j++) {
        await db
          .prepare('UPDATE evidence SET violation_id = ? WHERE id = ?')
          .bind(existing.id, candidate.evidenceIds[j])
          .run();
      }

      violations.push({ id: existing.id, updated: true, cost: cost, ...candidate });
      continue;
    }

    var id = generateId();
    await db
      .prepare(
        `INSERT INTO violations (id, site_domain, violation_type, severity, evidence_count,
         session_count, first_observed, last_observed,
         estimated_users, estimated_exposure_min, estimated_exposure_max)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        candidate.siteDomain,
        candidate.violationType,
        candidate.severity,
        candidate.evidenceIds.length,
        candidate.sessionCount,
        candidate.firstObserved,
        candidate.lastObserved,
        cost.estimatedUsers,
        cost.estimatedExposureMin,
        cost.estimatedExposureMax,
      )
      .run();

    for (var k = 0; k < candidate.evidenceIds.length; k++) {
      await db
        .prepare('UPDATE evidence SET violation_id = ? WHERE id = ?')
        .bind(id, candidate.evidenceIds[k])
        .run();
    }

    await appendAuditEntry(db, {
      action: 'violation_created',
      entityType: 'violation',
      entityId: id,
      actor: 'api',
      details: {
        siteDomain: candidate.siteDomain,
        violationType: candidate.violationType,
        severity: candidate.severity,
        evidenceCount: candidate.evidenceIds.length,
        confidence: candidate.confidence,
        estimatedUsers: cost.estimatedUsers,
        estimatedExposureMin: cost.estimatedExposureMin,
        estimatedExposureMax: cost.estimatedExposureMax,
      },
    });

    violations.push({ id: id, updated: false, cost: cost, ...candidate });
    created++;
  }

  return c.json({ candidates: violations, created });
});
