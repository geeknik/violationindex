import { buildEvidenceHash, hashSessionId } from '@violation-index/shared/crypto';
import type { EvidenceSubmission } from '@violation-index/shared/types';
import type { CapturedRequest } from './request-collector.js';

/**
 * Build an evidence submission record from a captured request.
 * All identifiers are hashed client-side before submission.
 *
 * Evidence hardening:
 * - requestTimestamp from browser webRequest API (not Date.now())
 * - GPC state at capture time
 * - Consent mechanism type and CMP name
 * - TCF consent string (proves no consent existed)
 */
export async function buildEvidenceRecord(
  captured: CapturedRequest,
  policySnapshotId: string | null,
): Promise<EvidenceSubmission> {
  var rawSessionData = captured.tabDomain + ':' + captured.tabId + ':' + captured.navigationStart;
  var sessionId = await hashSessionId(rawSessionData);

  var evidenceHash = await buildEvidenceHash({
    siteDomain: captured.tabDomain,
    observedUrl: captured.url,
    observedAt: new Date(captured.requestTimestamp).toISOString(),
    consentState: captured.consentStateAtCapture,
    requestType: captured.requestType,
    requestDestination: captured.destination,
    sessionId: sessionId,
  });

  return {
    siteDomain: captured.tabDomain,
    observedUrl: captured.url,
    observedAt: new Date(captured.requestTimestamp).toISOString(),
    consentState: captured.consentStateAtCapture,
    requestType: captured.requestType,
    requestDestination: captured.destination,
    evidenceHash: evidenceHash,
    policySnapshotId: policySnapshotId,
    sessionId: sessionId,
    gpcActive: captured.gpcActive,
    consentMechanism: captured.consentMechanism,
    cmpName: captured.cmpName,
    tcfConsentString: captured.tcfConsentString,
    // Tracking mechanism evidence
    requestMethod: captured.requestMethod,
    hasRequestBody: captured.hasRequestBody,
    requestContentType: captured.requestContentType,
    sentCookieNames: captured.sentCookieNames.length > 0 ? captured.sentCookieNames : null,
    setCookieNames: captured.setCookieNames.length > 0 ? captured.setCookieNames : null,
    trackingParams: captured.trackingParams.length > 0 ? captured.trackingParams : null,
    storageWrites: captured.storageWrites.length > 0 ? captured.storageWrites : null,
  };
}

/**
 * Build a batch of evidence submissions from captured requests.
 */
export async function buildEvidenceBatch(
  requests: readonly CapturedRequest[],
  policySnapshotId: string | null,
): Promise<readonly EvidenceSubmission[]> {
  var records: EvidenceSubmission[] = [];
  for (var i = 0; i < requests.length; i++) {
    var record = await buildEvidenceRecord(requests[i], policySnapshotId);
    records.push(record);
  }
  return records;
}
