import { z } from 'zod';
const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
export const consentStateSchema = z.enum(['pre_consent', 'post_consent', 'no_mechanism']);
export const requestTypeSchema = z.enum(['tracker', 'marketing', 'analytics']);
export const evidenceStatusSchema = z.enum(['unreviewed', 'confirmed', 'rejected', 'disputed']);
export const evidenceSubmissionSchema = z.object({
    siteDomain: z.string().min(3).max(253).regex(DOMAIN_PATTERN, 'Invalid domain format'),
    observedUrl: z.string().url().max(2048),
    observedAt: z.string().regex(ISO8601_PATTERN, 'Must be ISO 8601 UTC'),
    consentState: consentStateSchema,
    requestType: requestTypeSchema,
    requestDestination: z.string().min(3).max(253).regex(DOMAIN_PATTERN, 'Invalid domain format'),
    evidenceHash: z.string().regex(SHA256_PATTERN, 'Must be SHA-256 hex'),
    policySnapshotId: z.string().max(26).nullable(),
    sessionId: z.string().regex(SHA256_PATTERN, 'Must be SHA-256 hex'),
}).strict();
export const evidenceBatchSchema = z.object({
    installationId: z.string().regex(SHA256_PATTERN, 'Must be SHA-256 hex'),
    records: z.array(evidenceSubmissionSchema).min(1).max(100),
}).strict();
export const policySnapshotSubmissionSchema = z.object({
    siteDomain: z.string().min(3).max(253).regex(DOMAIN_PATTERN, 'Invalid domain format'),
    policyUrl: z.string().url().max(2048),
    contentHash: z.string().regex(SHA256_PATTERN, 'Must be SHA-256 hex'),
    fetchedAt: z.string().regex(ISO8601_PATTERN, 'Must be ISO 8601 UTC'),
    contentLength: z.number().int().min(1).max(10_000_000),
}).strict();
export const auditQuerySchema = z.object({
    entityType: z.enum(['evidence', 'policy_snapshot', 'violation']).optional(),
    entityId: z.string().max(26).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
}).strict();
//# sourceMappingURL=schema.js.map