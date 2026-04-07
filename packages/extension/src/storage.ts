import type { CapturedRequest } from './request-collector.js';

/**
 * Storage layer using browser.storage.local.
 * IndexedDB is not available in MV3 background event pages in Firefox,
 * so we use the extension storage API instead.
 */

interface StoredEvidence extends CapturedRequest {
  readonly id: number;
  readonly submitted: boolean;
}

interface StorageState {
  evidence: StoredEvidence[];
  nextId: number;
  installationId: string | null;
}

async function getState(): Promise<StorageState> {
  const result = await browser.storage.local.get(['evidence', 'nextId', 'installationId']);
  return {
    evidence: (result['evidence'] as StoredEvidence[] | undefined) ?? [],
    nextId: (result['nextId'] as number | undefined) ?? 1,
    installationId: (result['installationId'] as string | undefined) ?? null,
  };
}

/** Store a captured request locally */
export async function storeEvidence(request: CapturedRequest): Promise<void> {
  const state = await getState();
  const record: StoredEvidence = {
    ...request,
    id: state.nextId,
    submitted: false,
  };
  state.evidence.push(record);
  await browser.storage.local.set({
    evidence: state.evidence,
    nextId: state.nextId + 1,
  });
}

/** Get all unsubmitted evidence records */
export async function getUnsubmittedEvidence(): Promise<StoredEvidence[]> {
  const state = await getState();
  return state.evidence.filter((r) => !r.submitted);
}

/** Mark evidence records as submitted */
export async function markAsSubmitted(ids: readonly number[]): Promise<void> {
  const state = await getState();
  const idSet = new Set(ids);
  const updated = state.evidence.map((r) =>
    idSet.has(r.id) ? { ...r, submitted: true } : r,
  );
  await browser.storage.local.set({ evidence: updated });
}

/** Get or create the installation ID */
export async function getInstallationId(): Promise<string> {
  const state = await getState();
  if (state.installationId) return state.installationId;

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const id = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  await browser.storage.local.set({ installationId: id });
  return id;
}

/** Count evidence records by submission status */
export async function getEvidenceCounts(): Promise<{ total: number; unsubmitted: number }> {
  const state = await getState();
  const unsubmitted = state.evidence.filter((r) => !r.submitted).length;
  return { total: state.evidence.length, unsubmitted };
}
