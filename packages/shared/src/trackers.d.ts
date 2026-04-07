import type { TrackerEntry } from './types.js';
/**
 * Initial hardcoded list of known trackers.
 * Used by the extension to classify third-party requests.
 * Will be expanded via community contribution in later phases.
 */
export declare const KNOWN_TRACKERS: readonly TrackerEntry[];
/**
 * Check if a URL belongs to a known tracker.
 * Returns the tracker entry if matched, null otherwise.
 */
export declare function matchTracker(url: string): TrackerEntry | null;
//# sourceMappingURL=trackers.d.ts.map