import { Hono } from 'hono';
import { policySnapshotSubmissionSchema } from '@violation-index/shared';
import type { AppEnv } from '../index.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { insertPolicySnapshot } from '../db/queries.js';
import { appendAuditEntry } from '../audit-log.js';
import type { PolicySnapshotSubmissionInput } from '@violation-index/shared';

export const policySnapshotRoute = new Hono<AppEnv>();

policySnapshotRoute.post(
  '/policy-snapshot',
  rateLimit(50, 60),
  validateBody(policySnapshotSubmissionSchema),
  async (c) => {
    const snapshot = c.get('validatedBody') as PolicySnapshotSubmissionInput;
    const db = c.env.DB;

    try {
      const id = await insertPolicySnapshot(db, {
        siteDomain: snapshot.siteDomain,
        policyUrl: snapshot.policyUrl,
        contentHash: snapshot.contentHash,
        fetchedAt: snapshot.fetchedAt,
        contentLength: snapshot.contentLength,
        claimsExtracted: snapshot.claimsExtracted ?? null,
      });

      await appendAuditEntry(db, {
        action: 'policy_snapshot_created',
        entityType: 'policy_snapshot',
        entityId: id,
        actor: 'extension',
        details: {
          siteDomain: snapshot.siteDomain,
          contentHash: snapshot.contentHash,
          claimCount: snapshot.claimsExtracted?.length ?? 0,
        },
      });

      return c.json({ id, contentHash: snapshot.contentHash });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Policy snapshot error: ${message}`);
      return c.json({ error: 'Failed to store policy snapshot' }, 500);
    }
  },
);
