import { Hono } from 'hono';
import type { AppEnv } from '../index.js';
import { analystAuth } from '../middleware/analyst-auth.js';
import { ipRestrict } from '../middleware/ip-restrict.js';

export const evidenceQueryRoute = new Hono<AppEnv>();

/**
 * GET /api/v1/evidence
 * Analyst endpoint: query evidence with filters.
 */
evidenceQueryRoute.get('/evidence', ipRestrict(), analystAuth(), async (c) => {
  var db = c.env.DB;
  var domain = c.req.query('domain');
  var status = c.req.query('status');
  var limit = parseInt(c.req.query('limit') || '50', 10);
  var offset = parseInt(c.req.query('offset') || '0', 10);

  if (limit > 100) limit = 100;
  if (limit < 1) limit = 1;
  if (offset < 0) offset = 0;

  var conditions: string[] = [];
  var params: (string | number)[] = [];

  if (domain) {
    conditions.push('site_domain = ?');
    params.push(domain);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  var where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  var sql = 'SELECT * FROM evidence ' + where + ' ORDER BY observed_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  var rows = await db.prepare(sql).bind(...params).all();

  // Also get total count for pagination
  var countSql = 'SELECT COUNT(*) as total FROM evidence ' + where;
  var countParams = params.slice(0, -2); // Remove limit/offset
  var countStmt = db.prepare(countSql);
  var countResult = countParams.length > 0
    ? await countStmt.bind(...countParams).first<{ total: number }>()
    : await countStmt.first<{ total: number }>();

  return c.json({
    evidence: rows.results,
    total: countResult?.total ?? 0,
    limit,
    offset,
  });
});

/**
 * GET /api/v1/evidence/summary
 * Analyst endpoint: summary stats for dashboard.
 */
evidenceQueryRoute.get('/evidence/summary', ipRestrict(), analystAuth(), async (c) => {
  var db = c.env.DB;

  var stats = await db.prepare(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'unreviewed' THEN 1 ELSE 0 END) as unreviewed,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      COUNT(DISTINCT site_domain) as domains,
      COUNT(DISTINCT session_id) as sessions
    FROM evidence`,
  ).first();

  return c.json({ summary: stats });
});
