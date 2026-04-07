import { Hono } from 'hono';
import type { AppEnv } from '../index.js';
import { analystAuth } from '../middleware/analyst-auth.js';
import { ipRestrict } from '../middleware/ip-restrict.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validateId } from '../middleware/validate-id.js';
import { appendAuditEntry } from '../audit-log.js';

/** Column allowlist for public violations — never expose internal estimates or PII. */
const PUBLIC_COLUMNS = [
  'id', 'site_domain', 'violation_type', 'severity', 'status',
  'evidence_count', 'confidence', 'first_observed', 'last_observed',
  'clock_started_at', 'response_deadline', 'resolved_at', 'created_at',
].join(', ');

const MAX_PUBLIC_RESULTS = 200;

export const violationsRoute = new Hono<AppEnv>();

/**
 * GET /api/v1/violations/public
 * Public endpoint: returns active + remediated violations for the index page.
 * Bounded results, explicit column selection (no SELECT *).
 */
violationsRoute.get('/violations/public', rateLimit(1000, 60), async (c) => {
  const db = c.env.DB;
  const rows = await db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM violations
       WHERE status IN ('active', 'remediated', 'disputed', 'escalated_tier2')
       ORDER BY
         CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         evidence_count DESC
       LIMIT ?`,
    )
    .bind(MAX_PUBLIC_RESULTS)
    .all();

  return c.json({ violations: rows.results });
});

/**
 * GET /api/v1/violations
 * Analyst endpoint: returns all violations, filterable.
 */
violationsRoute.get('/violations', ipRestrict(), analystAuth(), async (c) => {
  var db = c.env.DB;
  var status = c.req.query('status');

  var sql = 'SELECT * FROM violations';
  var params: string[] = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT 100';

  var stmt = db.prepare(sql);
  var rows = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

  return c.json({ violations: rows.results });
});

/**
 * GET /api/v1/violations/:id
 * Analyst endpoint: single violation with linked evidence.
 */
violationsRoute.get('/violations/:id', ipRestrict(), analystAuth(), validateId(), async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  var violation = await db
    .prepare('SELECT * FROM violations WHERE id = ?')
    .bind(id)
    .first();

  if (!violation) {
    return c.json({ error: 'Violation not found' }, 404);
  }

  var evidence = await db
    .prepare('SELECT * FROM evidence WHERE violation_id = ? ORDER BY observed_at')
    .bind(id)
    .all();

  return c.json({ violation, evidence: evidence.results });
});

/**
 * POST /api/v1/violations/:id/confirm
 * Analyst confirms a violation → status becomes 'active', accountability clock starts.
 */
violationsRoute.post('/violations/:id/confirm', ipRestrict(), analystAuth(), validateId(), async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  var violation = await db
    .prepare('SELECT * FROM violations WHERE id = ?')
    .bind(id)
    .first<{ status: string }>();

  if (!violation) {
    return c.json({ error: 'Violation not found' }, 404);
  }

  if (violation.status !== 'unreviewed' && violation.status !== 'confirmed') {
    return c.json({ error: 'Violation is already ' + violation.status }, 400);
  }

  var now = new Date();
  var deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

  await db
    .prepare(
      `UPDATE violations SET
        status = 'active',
        clock_started_at = ?,
        response_deadline = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
    )
    .bind(now.toISOString(), deadline.toISOString(), id)
    .run();

  // Update linked evidence status
  await db
    .prepare("UPDATE evidence SET status = 'confirmed' WHERE violation_id = ?")
    .bind(id)
    .run();

  await appendAuditEntry(db, {
    action: 'clock_started',
    entityType: 'violation',
    entityId: id,
    actor: 'analyst',
    details: {
      clockStartedAt: now.toISOString(),
      responseDeadline: deadline.toISOString(),
    },
  });

  return c.json({
    id,
    status: 'active',
    clockStartedAt: now.toISOString(),
    responseDeadline: deadline.toISOString(),
  });
});

/**
 * POST /api/v1/violations/:id/reject
 * Analyst rejects a violation candidate.
 */
violationsRoute.post('/violations/:id/reject', ipRestrict(), analystAuth(), validateId(), async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  await db
    .prepare("UPDATE violations SET status = 'disputed', updated_at = datetime('now') WHERE id = ?")
    .bind(id)
    .run();

  await db
    .prepare("UPDATE evidence SET status = 'rejected' WHERE violation_id = ?")
    .bind(id)
    .run();

  await appendAuditEntry(db, {
    action: 'violation_status_changed',
    entityType: 'violation',
    entityId: id,
    actor: 'analyst',
    details: { newStatus: 'disputed', reason: 'Analyst rejected' },
  });

  return c.json({ id, status: 'disputed' });
});

/**
 * POST /api/v1/violations/:id/status
 * Update violation status (remediated, escalated, etc.)
 * Validates request body strictly — rejects unknown fields.
 */
violationsRoute.post('/violations/:id/status', ipRestrict(), analystAuth(), validateId(), async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');

  // Parse with explicit validation — reject malformed or oversized bodies
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return c.json({ error: 'Request body must be a JSON object' }, 400);
  }

  const bodyObj = body as Record<string, unknown>;
  const knownFields = new Set(['status']);
  const extraFields = Object.keys(bodyObj).filter((k) => !knownFields.has(k));
  if (extraFields.length > 0) {
    return c.json({ error: 'Unknown fields: ' + extraFields.join(', ') }, 400);
  }

  const newStatus = bodyObj['status'];
  if (typeof newStatus !== 'string') {
    return c.json({ error: 'status must be a string' }, 400);
  }

  const allowed = ['remediated', 'disputed', 'escalated_tier2'] as const;
  if (!allowed.includes(newStatus as typeof allowed[number])) {
    return c.json({ error: 'Invalid status. Allowed: ' + allowed.join(', ') }, 400);
  }

  const updates = newStatus === 'remediated'
    ? "status = ?, resolved_at = datetime('now'), updated_at = datetime('now')"
    : "status = ?, updated_at = datetime('now')";

  await db
    .prepare('UPDATE violations SET ' + updates + ' WHERE id = ?')
    .bind(newStatus, id)
    .run();

  await appendAuditEntry(db, {
    action: 'violation_status_changed',
    entityType: 'violation',
    entityId: id,
    actor: 'analyst',
    details: { newStatus },
  });

  return c.json({ id, status: newStatus });
});
