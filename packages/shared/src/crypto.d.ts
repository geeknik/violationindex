/**
 * Cryptographic utilities for evidence fingerprinting and audit chain integrity.
 * Uses Web Crypto API (available in browsers, Workers, and Node 20+).
 */
/** Compute SHA-256 hex digest of a string */
export declare function sha256(input: string): Promise<string>;
/**
 * Build a SHA-256 fingerprint of an evidence record.
 * Deterministic: same inputs always produce same hash.
 */
export declare function buildEvidenceHash(fields: {
    readonly siteDomain: string;
    readonly observedUrl: string;
    readonly observedAt: string;
    readonly consentState: string;
    readonly requestType: string;
    readonly requestDestination: string;
    readonly sessionId: string;
}): Promise<string>;
/**
 * Build a hash-chained audit entry hash.
 * Creates tamper-evident chain: modifying any entry breaks all subsequent hashes.
 */
export declare function buildAuditEntryHash(fields: {
    readonly timestamp: string;
    readonly action: string;
    readonly entityId: string;
    readonly prevHash: string | null;
}): Promise<string>;
/**
 * Hash a session identifier client-side.
 * Ensures the API never sees raw session data.
 */
export declare function hashSessionId(rawSessionData: string): Promise<string>;
/**
 * Hash an installation ID for deduplication.
 * The raw ID never leaves the extension.
 */
export declare function hashInstallationId(rawId: string): Promise<string>;
//# sourceMappingURL=crypto.d.ts.map