/**
 * Cryptographic utilities for evidence fingerprinting and audit chain integrity.
 * Uses Web Crypto API (available in browsers, Workers, and Node 20+).
 */

/** Compute SHA-256 hex digest of a string */
export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hash);
}

/** Convert ArrayBuffer to lowercase hex string */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hexPairs: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hexPairs.push((bytes[i] as number).toString(16).padStart(2, '0'));
  }
  return hexPairs.join('');
}

/**
 * Build a SHA-256 fingerprint of an evidence record.
 * Deterministic: same inputs always produce same hash.
 */
export async function buildEvidenceHash(fields: {
  readonly siteDomain: string;
  readonly observedUrl: string;
  readonly observedAt: string;
  readonly consentState: string;
  readonly requestType: string;
  readonly requestDestination: string;
  readonly sessionId: string;
}): Promise<string> {
  const canonical = [
    fields.siteDomain,
    fields.observedUrl,
    fields.observedAt,
    fields.consentState,
    fields.requestType,
    fields.requestDestination,
    fields.sessionId,
  ].join('|');
  return sha256(canonical);
}

/**
 * Build a hash-chained audit entry hash.
 * Creates tamper-evident chain: modifying any entry breaks all subsequent hashes.
 */
export async function buildAuditEntryHash(fields: {
  readonly timestamp: string;
  readonly action: string;
  readonly entityId: string;
  readonly prevHash: string | null;
}): Promise<string> {
  const canonical = [
    fields.timestamp,
    fields.action,
    fields.entityId,
    fields.prevHash ?? 'GENESIS',
  ].join('|');
  return sha256(canonical);
}

/**
 * Hash a session identifier client-side.
 * Ensures the API never sees raw session data.
 */
export async function hashSessionId(rawSessionData: string): Promise<string> {
  return sha256(`vi-session:${rawSessionData}`);
}

/**
 * Hash an installation ID for deduplication.
 * The raw ID never leaves the extension.
 */
export async function hashInstallationId(rawId: string): Promise<string> {
  return sha256(`vi-install:${rawId}`);
}
