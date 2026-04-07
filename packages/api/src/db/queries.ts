import type { AuditEntry } from '@violation-index/shared';

/** Generate a ULID-like sortable unique ID using timestamp + random bytes */
export function generateId(): string {
  const timestamp = Date.now().toString(36).padStart(9, '0');
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16);
  return `${timestamp}${random}`.toUpperCase().slice(0, 26);
}

export async function insertEvidence(
  db: D1Database,
  record: {
    readonly siteDomain: string;
    readonly observedUrl: string;
    readonly observedAt: string;
    readonly consentState: string;
    readonly requestType: string;
    readonly requestDestination: string;
    readonly evidenceHash: string;
    readonly policySnapshotId: string | null;
    readonly sessionId: string;
    readonly installationId: string;
    readonly gpcActive: boolean;
    readonly consentMechanism: string;
    readonly cmpName: string | null;
    readonly tcfConsentString: string | null;
    readonly requestMethod?: string | null;
    readonly hasRequestBody?: boolean;
    readonly requestContentType?: string | null;
    readonly sentCookieNames?: readonly string[] | null;
    readonly setCookieNames?: readonly string[] | null;
    readonly trackingParams?: readonly { name: string; value: string; paramType: string }[] | null;
    readonly storageWrites?: readonly { storageType: string; key: string; valueHash: string; valueLength: number; detectedAt: number }[] | null;
  },
): Promise<string | null> {
  // Validate observedAt is within a reasonable time range (not future, not > 30 days old)
  const observedTime = new Date(record.observedAt).getTime();
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (isNaN(observedTime) || observedTime > now + 60_000 || observedTime < now - thirtyDaysMs) {
    throw new Error('observedAt timestamp out of acceptable range');
  }

  const id = generateId();

  // Use INSERT OR IGNORE with the UNIQUE constraint on evidence_hash.
  // This is atomic at the SQLite level — no TOCTOU race.
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO evidence (id, site_domain, observed_url, observed_at, consent_state, request_type,
       request_destination, evidence_hash, policy_snapshot_id, session_id, installation_id,
       gpc_active, consent_mechanism, cmp_name, tcf_consent_string,
       request_method, has_request_body, request_content_type,
       sent_cookie_names, set_cookie_names, tracking_params, storage_writes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      record.siteDomain,
      record.observedUrl,
      record.observedAt,
      record.consentState,
      record.requestType,
      record.requestDestination,
      record.evidenceHash,
      record.policySnapshotId,
      record.sessionId,
      record.installationId,
      record.gpcActive ? 1 : 0,
      record.consentMechanism,
      record.cmpName,
      record.tcfConsentString,
      record.requestMethod ?? null,
      record.hasRequestBody ? 1 : 0,
      record.requestContentType ?? null,
      record.sentCookieNames ? JSON.stringify(record.sentCookieNames) : null,
      record.setCookieNames ? JSON.stringify(record.setCookieNames) : null,
      record.trackingParams ? JSON.stringify(record.trackingParams) : null,
      record.storageWrites ? JSON.stringify(record.storageWrites) : null,
    )
    .run();

  // If no rows were changed, the evidence_hash already exists (duplicate)
  if (result.meta.changes === 0) {
    return null;
  }

  return id;
}

export async function insertPolicySnapshot(
  db: D1Database,
  snapshot: {
    readonly siteDomain: string;
    readonly policyUrl: string;
    readonly contentHash: string;
    readonly fetchedAt: string;
    readonly contentLength: number;
    readonly claimsExtracted?: readonly { category: string; subject: string | null; claim: string; section: string | null }[] | null;
  },
): Promise<string> {
  const id = generateId();
  const claimsJson = snapshot.claimsExtracted ? JSON.stringify(snapshot.claimsExtracted) : null;

  // Use INSERT OR IGNORE with UNIQUE(content_hash, site_domain) constraint.
  // Atomic dedup — no TOCTOU race.
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO policy_snapshots (id, site_domain, policy_url, content_hash, fetched_at, content_length, claims_extracted)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      snapshot.siteDomain,
      snapshot.policyUrl,
      snapshot.contentHash,
      snapshot.fetchedAt,
      snapshot.contentLength,
      claimsJson,
    )
    .run();

  if (result.meta.changes === 0) {
    // Already exists — return existing ID, but update claims if they weren't set before
    const existing = await db
      .prepare('SELECT id, claims_extracted FROM policy_snapshots WHERE content_hash = ? AND site_domain = ?')
      .bind(snapshot.contentHash, snapshot.siteDomain)
      .first<{ id: string; claims_extracted: string | null }>();

    if (existing && !existing.claims_extracted && claimsJson) {
      await db
        .prepare('UPDATE policy_snapshots SET claims_extracted = ? WHERE id = ?')
        .bind(claimsJson, existing.id)
        .run();
    }

    return existing?.id ?? id;
  }

  return id;
}

export async function queryAuditLog(
  db: D1Database,
  filters: {
    readonly entityType?: string | undefined;
    readonly entityId?: string | undefined;
    readonly limit: number;
    readonly offset: number;
  },
): Promise<readonly AuditEntry[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.entityType) {
    conditions.push('entity_type = ?');
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    conditions.push('entity_id = ?');
    params.push(filters.entityId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`;
  params.push(filters.limit, filters.offset);

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<{
      id: number;
      timestamp: string;
      action: string;
      entity_type: string;
      entity_id: string;
      actor: string;
      details: string | null;
      prev_hash: string | null;
      entry_hash: string;
    }>();

  return result.results.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    action: row.action as AuditEntry['action'],
    entityType: row.entity_type,
    entityId: row.entity_id,
    actor: row.actor as AuditEntry['actor'],
    details: row.details,
    prevHash: row.prev_hash,
    entryHash: row.entry_hash,
  }));
}
