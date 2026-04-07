import { Hono } from 'hono';
import { auditQuerySchema } from '@violation-index/shared';
import type { AppEnv } from '../index.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { queryAuditLog } from '../db/queries.js';

export const auditRoute = new Hono<AppEnv>();

auditRoute.get('/audit', rateLimit(1000, 60), async (c) => {
  const rawQuery = {
    entityType: c.req.query('entity_type'),
    entityId: c.req.query('entity_id'),
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
  };

  const result = auditQuerySchema.safeParse(rawQuery);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return c.json({ error: 'Invalid query parameters', details: errors }, 400);
  }

  const { limit, offset, entityType, entityId } = result.data;
  const entries = await queryAuditLog(c.env.DB, {
    limit,
    offset,
    entityType: entityType ?? undefined,
    entityId: entityId ?? undefined,
  });
  return c.json({ entries, count: entries.length });
});
