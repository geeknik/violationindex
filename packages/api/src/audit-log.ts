import { buildAuditEntryHash } from '@violation-index/shared';
import type { AuditAction, AuditActor } from '@violation-index/shared';

/**
 * Append-only, hash-chained audit log writer.
 * Each entry's hash includes the previous entry's hash, creating a tamper-evident chain.
 *
 * CONCURRENCY: D1 is single-writer (SQLite), but concurrent Worker invocations
 * can interleave read-then-write. We use a retry loop: if the INSERT detects
 * that prev_hash has gone stale (another entry was inserted between our SELECT
 * and INSERT), we re-read and retry. The AUTOINCREMENT id guarantees ordering.
 *
 * Max 3 retries to prevent infinite loops under extreme concurrency.
 */
const MAX_CHAIN_RETRIES = 3;

export async function appendAuditEntry(
  db: D1Database,
  entry: {
    readonly action: AuditAction;
    readonly entityType: string;
    readonly entityId: string;
    readonly actor: AuditActor;
    readonly details?: Record<string, unknown>;
  },
): Promise<void> {
  const timestamp = new Date().toISOString();
  const detailsJson = entry.details ? JSON.stringify(entry.details) : null;

  for (let attempt = 0; attempt < MAX_CHAIN_RETRIES; attempt++) {
    // Read the latest entry hash for chaining
    const lastEntry = await db
      .prepare('SELECT id, entry_hash FROM audit_log ORDER BY id DESC LIMIT 1')
      .first<{ id: number; entry_hash: string }>();

    const prevHash = lastEntry?.entry_hash ?? null;
    const prevId = lastEntry?.id ?? 0;

    const entryHash = await buildAuditEntryHash({
      timestamp,
      action: entry.action,
      entityId: entry.entityId,
      prevHash,
    });

    // Use a conditional insert: only succeed if the last entry ID hasn't changed.
    // This detects concurrent inserts that would fork the chain.
    const result = await db
      .prepare(
        `INSERT INTO audit_log (timestamp, action, entity_type, entity_id, actor, details, prev_hash, entry_hash)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?
         WHERE (SELECT COALESCE(MAX(id), 0) FROM audit_log) = ?`,
      )
      .bind(
        timestamp,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.actor,
        detailsJson,
        prevHash,
        entryHash,
        prevId,
      )
      .run();

    if (result.meta.changes > 0) {
      return; // Success — entry was inserted with valid chain link
    }

    // Chain moved — another entry was inserted concurrently. Retry with fresh prev_hash.
    console.log('[audit-log] Chain contention detected, retry ' + String(attempt + 1));
  }

  // Fallback: insert without chain validation to avoid data loss.
  // The chain will have a gap that can be detected during verification.
  console.error('[audit-log] Chain contention exceeded retries, inserting with potential fork');
  const lastEntry = await db
    .prepare('SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1')
    .first<{ entry_hash: string }>();

  const prevHash = lastEntry?.entry_hash ?? null;
  const entryHash = await buildAuditEntryHash({
    timestamp,
    action: entry.action,
    entityId: entry.entityId,
    prevHash,
  });

  await db
    .prepare(
      `INSERT INTO audit_log (timestamp, action, entity_type, entity_id, actor, details, prev_hash, entry_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      timestamp,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.actor,
      detailsJson,
      prevHash,
      entryHash,
    )
    .run();
}
