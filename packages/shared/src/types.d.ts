/** Consent state at the time a request was observed */
export type ConsentState = 'pre_consent' | 'post_consent' | 'no_mechanism';
/** Classification of observed third-party request */
export type RequestType = 'tracker' | 'marketing' | 'analytics';
/** Review status of an evidence submission */
export type EvidenceStatus = 'unreviewed' | 'confirmed' | 'rejected' | 'disputed';
/** Escalation status of a violation */
export type ViolationStatus = 'unreviewed' | 'confirmed' | 'active' | 'remediated' | 'disputed' | 'escalated_tier2';
/** Actor who performed an auditable action */
export type AuditActor = 'extension' | 'api' | 'analyst';
/** Actions recorded in the audit log */
export type AuditAction = 'evidence_submitted' | 'evidence_confirmed' | 'evidence_rejected' | 'evidence_disputed' | 'policy_snapshot_created' | 'violation_created' | 'violation_status_changed' | 'clock_started' | 'clock_escalated';
/** A single observed third-party request with consent context */
export interface EvidenceRecord {
    readonly id: string;
    readonly siteDomain: string;
    readonly observedUrl: string;
    readonly observedAt: string;
    readonly consentState: ConsentState;
    readonly requestType: RequestType;
    readonly requestDestination: string;
    readonly evidenceHash: string;
    readonly policySnapshotId: string | null;
    readonly sessionId: string;
    readonly submittedAt: string;
    readonly status: EvidenceStatus;
}
/** Submission payload from extension to API */
export interface EvidenceSubmission {
    readonly siteDomain: string;
    readonly observedUrl: string;
    readonly observedAt: string;
    readonly consentState: ConsentState;
    readonly requestType: RequestType;
    readonly requestDestination: string;
    readonly evidenceHash: string;
    readonly policySnapshotId: string | null;
    readonly sessionId: string;
}
/** Batch submission from extension */
export interface EvidenceBatch {
    readonly installationId: string;
    readonly records: readonly EvidenceSubmission[];
}
/** Response from ingestion API */
export interface IngestionResponse {
    readonly accepted: number;
    readonly rejected: number;
    readonly errors: readonly string[];
}
/** SHA-256 hashed snapshot of a privacy policy */
export interface PolicySnapshot {
    readonly id: string;
    readonly siteDomain: string;
    readonly policyUrl: string;
    readonly contentHash: string;
    readonly fetchedAt: string;
    readonly contentLength: number;
    readonly claimsExtracted: readonly string[] | null;
}
/** Submission payload for policy snapshots */
export interface PolicySnapshotSubmission {
    readonly siteDomain: string;
    readonly policyUrl: string;
    readonly contentHash: string;
    readonly fetchedAt: string;
    readonly contentLength: number;
}
/** Immutable, hash-chained audit log entry */
export interface AuditEntry {
    readonly id: number;
    readonly timestamp: string;
    readonly action: AuditAction;
    readonly entityType: string;
    readonly entityId: string;
    readonly actor: AuditActor;
    readonly details: string | null;
    readonly prevHash: string | null;
    readonly entryHash: string;
}
/** Health check response */
export interface HealthResponse {
    readonly status: 'ok';
    readonly version: string;
}
/** Consent detection result from content script */
export interface ConsentDetectionResult {
    readonly detected: boolean;
    readonly mechanism: 'tcf' | 'gpc' | 'cmp_dom' | 'generic_banner' | 'none';
    readonly cmpName: string | null;
    readonly consentState: ConsentState;
    readonly detectedAt: number;
}
/** Known tracker entry */
export interface TrackerEntry {
    readonly domain: string;
    readonly category: RequestType;
    readonly name: string;
}
//# sourceMappingURL=types.d.ts.map