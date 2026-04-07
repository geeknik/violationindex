import { matchTracker } from '@violation-index/shared/trackers';
import type { RequestType, ConsentState, TrackingParameter, StorageWriteEvidence } from '@violation-index/shared/types';

/** Consent metadata reported by the content script */
export interface ConsentMetadata {
  mechanism: string;
  cmpName: string | null;
  gpcActive: boolean;
  tcfConsentString: string | null;
  tcfPurposeConsents: string | null;
  detectedAt: number | null;
}

/** Known URL parameters that prove identity correlation */
var TRACKING_PARAMS: Record<string, TrackingParameter['paramType']> = {
  gclid: 'click_id',
  gbraid: 'click_id',
  wbraid: 'click_id',
  dclid: 'click_id',
  fbclid: 'click_id',
  _fbc: 'click_id',
  _fbp: 'fingerprint',
  msclkid: 'click_id',
  twclid: 'click_id',
  li_fat_id: 'click_id',
  ttclid: 'click_id',
  epik: 'click_id',
  ScCid: 'click_id',
  _ga: 'session_id',
  _gid: 'session_id',
  _scid: 'session_id',
  uid: 'user_id',
  userid: 'user_id',
  visitor_id: 'user_id',
  _uc: 'user_id',
};

/** Extract known tracking parameters from a URL */
export function extractTrackingParams(url: string): TrackingParameter[] {
  try {
    var parsed = new URL(url);
    var results: TrackingParameter[] = [];
    parsed.searchParams.forEach(function(value, key) {
      var paramType = TRACKING_PARAMS[key.toLowerCase()];
      if (paramType && value.length > 0) {
        results.push({ name: key, value: value, paramType: paramType });
      }
    });
    return results;
  } catch (e) {
    return [];
  }
}

/** A captured third-party request with timing, classification, and tracking evidence */
export interface CapturedRequest {
  readonly url: string;
  readonly destination: string;
  readonly requestType: RequestType;
  readonly trackerName: string;
  readonly capturedAt: number;
  /** Browser webRequest.timeStamp — more authoritative than Date.now() */
  readonly requestTimestamp: number;
  readonly consentStateAtCapture: ConsentState;
  readonly tabId: number;
  readonly tabDomain: string;
  readonly navigationStart: number;
  /** GPC signal active when this request was captured */
  readonly gpcActive: boolean;
  /** Consent mechanism type detected on this page */
  readonly consentMechanism: string;
  /** CMP name if detected */
  readonly cmpName: string | null;
  /** TCF consent string at capture time (null = no consent given) */
  readonly tcfConsentString: string | null;
  /** HTTP method (GET, POST, etc.) */
  readonly requestMethod: string;
  /** Whether the request carried a body */
  readonly hasRequestBody: boolean;
  /** Content-Type of the request */
  readonly requestContentType: string | null;
  /** Tracking parameters extracted from URL */
  readonly trackingParams: readonly TrackingParameter[];
  /** Cookie names sent TO the tracker (populated by onBeforeSendHeaders) */
  sentCookieNames: string[];
  /** Cookie names SET BY the tracker response (populated by onHeadersReceived) */
  setCookieNames: string[];
  /** Storage writes attributed to this tracker domain */
  storageWrites: StorageWriteEvidence[];
}

/** Per-tab tracking state */
interface TabState {
  domain: string;
  consentState: ConsentState;
  requests: CapturedRequest[];
  navigationStart: number;
  consent: ConsentMetadata;
  storageWrites: StorageWriteEvidence[];
}

var tabStates = new Map<number, TabState>();

/** Initialize tracking for a tab when navigation starts */
export function initTab(tabId: number, url: string): void {
  var domain: string;
  try {
    domain = new URL(url).hostname.toLowerCase();
  } catch (e) {
    return;
  }

  tabStates.set(tabId, {
    domain: domain,
    consentState: 'pre_consent',
    requests: [],
    navigationStart: Date.now(),
    consent: {
      mechanism: 'none',
      cmpName: null,
      gpcActive: false,
      tcfConsentString: null,
      tcfPurposeConsents: null,
      detectedAt: null,
    },
    storageWrites: [],
  });
}

/** Update the consent state and metadata for a tab */
export function updateConsentState(tabId: number, state: ConsentState, metadata?: Partial<ConsentMetadata>): void {
  var tab = tabStates.get(tabId);
  if (!tab) return;

  tab.consentState = state;
  if (metadata) {
    if (metadata.mechanism !== undefined) tab.consent.mechanism = metadata.mechanism;
    if (metadata.cmpName !== undefined) tab.consent.cmpName = metadata.cmpName;
    if (metadata.gpcActive !== undefined) tab.consent.gpcActive = metadata.gpcActive;
    if (metadata.tcfConsentString !== undefined) tab.consent.tcfConsentString = metadata.tcfConsentString;
    if (metadata.tcfPurposeConsents !== undefined) tab.consent.tcfPurposeConsents = metadata.tcfPurposeConsents;
    if (metadata.detectedAt !== undefined) tab.consent.detectedAt = metadata.detectedAt;
  }
}

/** Get the current consent state for a tab */
export function getConsentState(tabId: number): ConsentState | null {
  return tabStates.get(tabId)?.consentState ?? null;
}

/**
 * Process an observed webRequest.
 * Captures tracker classification, consent state, request metadata, and URL tracking params.
 * Cookie data is enriched asynchronously by onBeforeSendHeaders/onHeadersReceived.
 */
export function processRequest(
  tabId: number,
  requestUrl: string,
  requestTimestamp: number,
  method: string,
  hasBody: boolean,
  resourceType: string,
): CapturedRequest | null {
  var tab = tabStates.get(tabId);
  if (!tab) return null;

  var tracker = matchTracker(requestUrl);
  if (!tracker) return null;

  var destination: string;
  try {
    destination = new URL(requestUrl).hostname.toLowerCase();
  } catch (e) {
    return null;
  }

  // Skip first-party requests
  if (destination === tab.domain || destination.endsWith('.' + tab.domain)) {
    return null;
  }

  // Deduplicate: skip if same destination already captured in this session
  if (tab.requests.some(function(r) { return r.destination === destination; })) {
    return null;
  }

  // Infer content type from resource type (actual header captured in onBeforeSendHeaders)
  var contentType: string | null = null;
  if (resourceType === 'xmlhttprequest') contentType = 'xhr';
  if (resourceType === 'beacon') contentType = 'beacon';
  if (resourceType === 'ping') contentType = 'ping';

  var captured: CapturedRequest = {
    url: requestUrl,
    destination: destination,
    requestType: tracker.category,
    trackerName: tracker.name,
    capturedAt: Date.now(),
    requestTimestamp: requestTimestamp,
    consentStateAtCapture: tab.consentState,
    tabId: tabId,
    tabDomain: tab.domain,
    navigationStart: tab.navigationStart,
    gpcActive: tab.consent.gpcActive,
    consentMechanism: tab.consent.mechanism,
    cmpName: tab.consent.cmpName,
    tcfConsentString: tab.consent.tcfConsentString,
    requestMethod: method,
    hasRequestBody: hasBody,
    requestContentType: contentType,
    trackingParams: extractTrackingParams(requestUrl),
    sentCookieNames: [],
    setCookieNames: [],
    storageWrites: [],
  };

  tab.requests.push(captured);
  return captured;
}

/**
 * Enrich a captured request with outgoing Cookie header data.
 * Called from webRequest.onBeforeSendHeaders.
 */
export function enrichWithSentCookies(tabId: number, requestUrl: string, cookieNames: string[]): void {
  var tab = tabStates.get(tabId);
  if (!tab) return;

  var destination: string;
  try {
    destination = new URL(requestUrl).hostname.toLowerCase();
  } catch (e) {
    return;
  }

  for (var i = 0; i < tab.requests.length; i++) {
    if (tab.requests[i].destination === destination) {
      tab.requests[i].sentCookieNames = cookieNames;
      return;
    }
  }
}

/**
 * Enrich a captured request with Set-Cookie response data.
 * Called from webRequest.onHeadersReceived.
 */
export function enrichWithSetCookies(tabId: number, requestUrl: string, cookieNames: string[]): void {
  var tab = tabStates.get(tabId);
  if (!tab) return;

  var destination: string;
  try {
    destination = new URL(requestUrl).hostname.toLowerCase();
  } catch (e) {
    return;
  }

  for (var i = 0; i < tab.requests.length; i++) {
    if (tab.requests[i].destination === destination) {
      tab.requests[i].setCookieNames = cookieNames;
      return;
    }
  }
}

/**
 * Enrich a captured request with Content-Type from the actual request header.
 * Called from webRequest.onBeforeSendHeaders.
 */
export function enrichWithContentType(tabId: number, requestUrl: string, contentType: string): void {
  var tab = tabStates.get(tabId);
  if (!tab) return;

  var destination: string;
  try {
    destination = new URL(requestUrl).hostname.toLowerCase();
  } catch (e) {
    return;
  }

  for (var i = 0; i < tab.requests.length; i++) {
    if (tab.requests[i].destination === destination) {
      tab.requests[i].requestContentType = contentType;
      return;
    }
  }
}

/**
 * Add a storage write event from the content script.
 * Associates with tracker requests on the same tab by domain matching.
 */
export function addStorageWrite(tabId: number, write: StorageWriteEvidence): void {
  var tab = tabStates.get(tabId);
  if (!tab) return;

  tab.storageWrites.push(write);

  // Attribute to all tracker requests on this tab (storage writes are page-level)
  for (var i = 0; i < tab.requests.length; i++) {
    tab.requests[i].storageWrites.push(write);
  }
}

/** Get all captured requests for a tab */
export function getTabRequests(tabId: number): readonly CapturedRequest[] {
  return tabStates.get(tabId)?.requests ?? [];
}

/** Get only pre-consent tracker requests for a tab */
export function getPreConsentRequests(tabId: number): readonly CapturedRequest[] {
  return getTabRequests(tabId).filter(function(r) { return r.consentStateAtCapture === 'pre_consent'; });
}

/** Get the domain for a tab */
export function getTabDomain(tabId: number): string | null {
  return tabStates.get(tabId)?.domain ?? null;
}

/** Check if a tab has any pre-consent violations */
export function hasPreConsentViolations(tabId: number): boolean {
  var tab = tabStates.get(tabId);
  if (!tab) return false;
  return tab.requests.some(function(r) { return r.consentStateAtCapture === 'pre_consent'; });
}

/** Clear state for a tab (on close or navigation) */
export function clearTab(tabId: number): void {
  tabStates.delete(tabId);
}

/** Get summary counts for a tab */
export function getTabSummary(tabId: number): {
  total: number;
  preConsent: number;
  postConsent: number;
  domain: string | null;
} {
  var tab = tabStates.get(tabId);
  if (!tab) return { total: 0, preConsent: 0, postConsent: 0, domain: null };

  var preConsent = tab.requests.filter(function(r) { return r.consentStateAtCapture === 'pre_consent'; }).length;
  return {
    total: tab.requests.length,
    preConsent: preConsent,
    postConsent: tab.requests.length - preConsent,
    domain: tab.domain,
  };
}
