import { hashInstallationId } from '@violation-index/shared/crypto';
import type { IngestionResponse, PolicySnapshotSubmission } from '@violation-index/shared/types';
import { getInstallationId, getUnsubmittedEvidence, markAsSubmitted } from './storage.js';
import { buildEvidenceRecord } from './evidence-builder.js';
import type { LocalPolicySnapshot } from './policy-snapshot.js';

const API_BASE = 'https://api.violationindex.com';

/**
 * Submit all unsubmitted evidence to the ingestion API.
 * User-initiated only — never called automatically.
 * Links evidence to policy snapshot IDs when available.
 */
export async function submitEvidence(): Promise<IngestionResponse> {
  var rawInstallationId = await getInstallationId();
  var installationId = await hashInstallationId(rawInstallationId);

  var unsubmitted = await getUnsubmittedEvidence();
  if (unsubmitted.length === 0) {
    return { accepted: 0, rejected: 0, errors: [] };
  }

  // Look up cached policy snapshot IDs from storage
  var snapshotResult = await browser.storage.local.get('policySnapshots');
  var snapshotMap = (snapshotResult['policySnapshots'] || {}) as Record<string, string>;

  // Build evidence records with per-domain snapshot IDs
  var records = [];
  for (var i = 0; i < unsubmitted.length; i++) {
    var req = unsubmitted[i];
    var snapshotId = snapshotMap[req.tabDomain] || null;
    var record = await buildEvidenceRecord(req, snapshotId);
    records.push(record);
  }

  // Submit in batches of 100
  var totalAccepted = 0;
  var totalRejected = 0;
  var allErrors: string[] = [];
  var submittedIds: number[] = [];

  for (var j = 0; j < records.length; j += 100) {
    var batch = records.slice(j, j + 100);
    var batchSourceIds = unsubmitted.slice(j, j + 100).map(function(r) { return r.id; });

    try {
      var response = await fetch(API_BASE + '/api/v1/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installationId: installationId, records: batch }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        var errorText = await response.text().catch(function() { return 'Unknown error'; });
        allErrors.push('Batch ' + Math.floor(j / 100) + ': HTTP ' + response.status + ' — ' + errorText);
        totalRejected += batch.length;
        continue;
      }

      var result: IngestionResponse = await response.json();
      totalAccepted += result.accepted;
      totalRejected += result.rejected;
      allErrors.push.apply(allErrors, result.errors as string[]);

      if (result.accepted > 0) {
        submittedIds.push.apply(submittedIds, batchSourceIds);
      }
    } catch (err) {
      var message = err instanceof Error ? err.message : 'Network error';
      allErrors.push('Batch ' + Math.floor(j / 100) + ': ' + message);
      totalRejected += batch.length;
    }
  }

  if (submittedIds.length > 0) {
    await markAsSubmitted(submittedIds);
  }

  return {
    accepted: totalAccepted,
    rejected: totalRejected,
    errors: allErrors,
  };
}

/**
 * Submit a policy snapshot to the API and cache the returned ID.
 */
export async function submitPolicySnapshot(
  snapshot: PolicySnapshotSubmission | LocalPolicySnapshot,
): Promise<{ id: string } | null> {
  try {
    // Send only the API-safe fields (exclude plaintext which is local-only)
    var payload: Record<string, unknown> = {
      siteDomain: snapshot.siteDomain,
      policyUrl: snapshot.policyUrl,
      contentHash: snapshot.contentHash,
      fetchedAt: snapshot.fetchedAt,
      contentLength: snapshot.contentLength,
      claimsExtracted: ('claimsExtracted' in snapshot && snapshot.claimsExtracted) ? snapshot.claimsExtracted : null,
    };

    var response = await fetch(API_BASE + '/api/v1/policy-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    var result = await response.json() as { id: string };

    // Cache the snapshot ID for this domain in extension storage
    var existing = await browser.storage.local.get('policySnapshots');
    var snapshots = (existing['policySnapshots'] || {}) as Record<string, string>;
    snapshots[snapshot.siteDomain] = result.id;
    await browser.storage.local.set({ policySnapshots: snapshots });

    return result;
  } catch (e) {
    return null;
  }
}
