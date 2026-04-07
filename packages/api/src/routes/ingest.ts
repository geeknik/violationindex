import { Hono } from 'hono';
import { evidenceBatchSchema } from '@violation-index/shared';
import type { AppEnv } from '../index.js';
import { validateBody } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { insertEvidence } from '../db/queries.js';
import { appendAuditEntry } from '../audit-log.js';
import type { EvidenceBatchInput } from '@violation-index/shared';

export const ingestRoute = new Hono<AppEnv>();

ingestRoute.post(
  '/evidence',
  rateLimit(100, 60),
  validateBody(evidenceBatchSchema),
  async (c) => {
    const batch = c.get('validatedBody') as EvidenceBatchInput;
    const db = c.env.DB;

    let accepted = 0;
    const errors: string[] = [];

    for (let i = 0; i < batch.records.length; i++) {
      const record = batch.records[i]!;
      try {
        const id = await insertEvidence(db, {
          ...record,
          installationId: batch.installationId,
        });

        if (id === null) {
          // Duplicate evidence_hash — already recorded, skip silently
          accepted++;
          continue;
        }

        await appendAuditEntry(db, {
          action: 'evidence_submitted',
          entityType: 'evidence',
          entityId: id,
          actor: 'extension',
          details: {
            siteDomain: record.siteDomain,
            consentState: record.consentState,
            requestDestination: record.requestDestination,
          },
        });

        accepted++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Record ${i}: ${message}`);
      }
    }

    const rejected = batch.records.length - accepted;
    return c.json({ accepted, rejected, errors }, accepted > 0 ? 200 : 400);
  },
);
