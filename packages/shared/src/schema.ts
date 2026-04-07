import { z } from 'zod';

const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export const consentStateSchema = z.enum(['pre_consent', 'post_consent', 'no_mechanism']);
export const requestTypeSchema = z.enum(['tracker', 'marketing', 'analytics']);
export const evidenceStatusSchema = z.enum(['unreviewed', 'confirmed', 'rejected', 'disputed']);

/** Tracking parameter found in a request URL (gclid, fbclid, etc.) */
export const trackingParamSchema = z.object({
  name: z.string().max(50),
  value: z.string().max(200),
  paramType: z.enum(['click_id', 'user_id', 'session_id', 'fingerprint']),
}).strict();

/** Storage write detected by content script */
export const storageWriteSchema = z.object({
  storageType: z.enum(['localStorage', 'sessionStorage']),
  key: z.string().max(200),
  valueHash: z.string().regex(SHA256_PATTERN, 'Must be SHA-256 hex'),
  valueLength: z.number().int().min(0).max(10_000_000),
  detectedAt: z.number(),
}).strict();

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
  gpcActive: z.boolean(),
  consentMechanism: z.string().max(50),
  cmpName: z.string().max(100).nullable(),
  tcfConsentString: z.string().max(2000).nullable(),
  // Tracking mechanism evidence (nullable for backward compat with older extension versions)
  requestMethod: z.string().max(10).nullable().default(null),
  hasRequestBody: z.boolean().default(false),
  requestContentType: z.string().max(200).nullable().default(null),
  sentCookieNames: z.array(z.string().max(100)).max(50).nullable().default(null),
  setCookieNames: z.array(z.string().max(100)).max(50).nullable().default(null),
  trackingParams: z.array(trackingParamSchema).max(20).nullable().default(null),
  storageWrites: z.array(storageWriteSchema).max(50).nullable().default(null),
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

export type EvidenceSubmissionInput = z.infer<typeof evidenceSubmissionSchema>;
export type EvidenceBatchInput = z.infer<typeof evidenceBatchSchema>;
export type PolicySnapshotSubmissionInput = z.infer<typeof policySnapshotSubmissionSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
