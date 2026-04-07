import {
  initTab,
  processRequest,
  clearTab,
  updateConsentState,
  getTabSummary,
  getPreConsentRequests,
  getTabRequests,
  getTabDomain,
  hasPreConsentViolations,
  enrichWithSentCookies,
  enrichWithSetCookies,
  enrichWithContentType,
  addStorageWrite,
} from './request-collector.js';
import { storeEvidence } from './storage.js';
import { submitEvidence, submitPolicySnapshot } from './api-client.js';
import { snapshotPolicy } from './policy-snapshot.js';
import { findUndisclosedTrackers } from './policy-analyzer.js';
import type { ConsentState, PolicyClaim } from '@violation-index/shared/types';

console.log('[consent.watch] Background script loaded');

var policySnapshotCache = new Map<string, string | null>();
/** Per-domain policy claims for popup display */
var policyClaimsCache = new Map<string, { claims: PolicyClaim[]; undisclosed: PolicyClaim[]; policyUrl: string }>();

// Navigation start → initialize tab tracking
browser.webNavigation.onBeforeNavigate.addListener(function(details) {
  if (details.frameId !== 0) return;
  console.log('[consent.watch] Navigation: tab=' + details.tabId + ' url=' + details.url);
  initTab(details.tabId, details.url);
});

// Page load complete → snapshot policy if violations found
browser.webNavigation.onCompleted.addListener(function(details) {
  if (details.frameId !== 0) return;

  var domain = getTabDomain(details.tabId);
  if (!domain) return;
  if (!hasPreConsentViolations(details.tabId)) return;
  if (policySnapshotCache.has(domain)) return;

  console.log('[consent.watch] Snapshotting policy for: ' + domain);
  policySnapshotCache.set(domain, null);

  snapshotPolicy(domain, details.tabId).then(function(snapshot) {
    if (snapshot) {
      console.log('[consent.watch] Policy snapshot: ' + domain + ' hash=' + snapshot.contentHash.slice(0, 16) + '... claims=' + snapshot.claimsExtracted.length);

      // Log extracted claims
      for (var ci = 0; ci < snapshot.claimsExtracted.length; ci++) {
        var claim = snapshot.claimsExtracted[ci];
        console.log('[consent.watch] Policy claim: [' + claim.category + '] ' + (claim.subject || 'general') + ' — ' + claim.claim.slice(0, 80) + '...');
      }

      // Find undisclosed trackers by comparing claims against observed requests
      var observed = getTabRequests(details.tabId).map(function(r) {
        return { name: r.trackerName, destination: r.destination };
      });
      var undisclosed = findUndisclosedTrackers(snapshot.claimsExtracted, observed);

      if (undisclosed.length > 0) {
        console.log('[consent.watch] UNDISCLOSED TRACKERS on ' + domain + ':');
        for (var ui = 0; ui < undisclosed.length; ui++) {
          console.log('[consent.watch]   ⚠ ' + undisclosed[ui].subject + ' — ' + undisclosed[ui].claim);
        }
      }

      // Cache claims for popup display
      policyClaimsCache.set(domain, {
        claims: snapshot.claimsExtracted.slice(),
        undisclosed: undisclosed,
        policyUrl: snapshot.policyUrl,
      });

      submitPolicySnapshot(snapshot).then(function(result) {
        if (result) {
          console.log('[consent.watch] Policy snapshot stored: id=' + result.id);
          policySnapshotCache.set(domain, result.id);
        }
      }).catch(function(err) {
        console.error('[consent.watch] Policy snapshot submit failed:', err);
      });
    } else {
      console.log('[consent.watch] No privacy policy found for: ' + domain);
    }
  }).catch(function(err) {
    console.error('[consent.watch] Policy snapshot error:', err);
  });
});

// Tab close → clean up
browser.tabs.onRemoved.addListener(function(tabId) {
  clearTab(tabId);
});

// webRequest.onBeforeRequest — capture tracker requests with method and body metadata
browser.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.tabId < 0) return;
    if (details.type === 'main_frame') return;

    var hasBody = details.requestBody !== null && details.requestBody !== undefined;
    var captured = processRequest(
      details.tabId,
      details.url,
      details.timeStamp,
      details.method,
      hasBody,
      details.type,
    );
    if (captured) {
      var params = captured.trackingParams.length > 0
        ? ' params:[' + captured.trackingParams.map(function(p) { return p.name; }).join(',') + ']'
        : '';
      console.log(
        '[consent.watch] Tracker: ' + captured.trackerName +
        ' (' + captured.destination + ') on ' + captured.tabDomain +
        ' — consent: ' + captured.consentStateAtCapture +
        ' method: ' + captured.requestMethod +
        ' body: ' + captured.hasRequestBody +
        params
      );
      if (captured.consentStateAtCapture === 'pre_consent') {
        storeEvidence(captured).catch(function(err) {
          console.error('[consent.watch] Failed to store evidence:', err);
        });
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody'],
);

// webRequest.onBeforeSendHeaders — capture outgoing Cookie headers to tracker domains
browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    if (details.tabId < 0 || details.type === 'main_frame') return;
    if (!details.requestHeaders) return;

    var cookieNames: string[] = [];
    var contentType: string | null = null;

    for (var i = 0; i < details.requestHeaders.length; i++) {
      var header = details.requestHeaders[i];
      var name = header.name.toLowerCase();

      if (name === 'cookie' && header.value) {
        // Extract cookie names only — never store values (may contain PII)
        var pairs = header.value.split(';');
        for (var j = 0; j < pairs.length; j++) {
          var cookieName = pairs[j].trim().split('=')[0].trim();
          if (cookieName.length > 0) {
            cookieNames.push(cookieName);
          }
        }
      }

      if (name === 'content-type' && header.value) {
        contentType = header.value.split(';')[0].trim();
      }
    }

    if (cookieNames.length > 0) {
      enrichWithSentCookies(details.tabId, details.url, cookieNames);
    }
    if (contentType) {
      enrichWithContentType(details.tabId, details.url, contentType);
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders'],
);

// webRequest.onHeadersReceived — capture Set-Cookie response headers from tracker domains
browser.webRequest.onHeadersReceived.addListener(
  function(details) {
    if (details.tabId < 0 || details.type === 'main_frame') return;
    if (!details.responseHeaders) return;

    var setCookieNames: string[] = [];
    for (var i = 0; i < details.responseHeaders.length; i++) {
      var header = details.responseHeaders[i];
      if (header.name.toLowerCase() === 'set-cookie' && header.value) {
        // Extract only the cookie name from "name=value; attributes..."
        var cookieName = header.value.split('=')[0].trim();
        if (cookieName.length > 0) {
          setCookieNames.push(cookieName);
        }
      }
    }

    if (setCookieNames.length > 0) {
      enrichWithSetCookies(details.tabId, details.url, setCookieNames);
      console.log(
        '[consent.watch] Cookies set by ' + details.url.split('/')[2] +
        ': ' + setCookieNames.join(', ')
      );
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders'],
);

// Unified message handler
browser.runtime.onMessage.addListener(
  function(message: unknown, sender, sendResponse) {
    if (typeof message !== 'object' || message === null) return false;
    var msg = message as Record<string, unknown>;

    // Content script: consent state update with enriched metadata
    if (msg['type'] === 'consentStateUpdate' && sender.tab?.id) {
      var consentState = msg['consentState'] as ConsentState;
      console.log(
        '[consent.watch] Consent update: tab=' + sender.tab.id +
        ' state=' + consentState +
        ' mechanism=' + (msg['mechanism'] || 'none') +
        ' gpc=' + (msg['gpcActive'] || false) +
        ' tcf=' + (msg['tcfConsentString'] ? 'present' : 'none')
      );
      updateConsentState(sender.tab.id, consentState, {
        mechanism: msg['mechanism'] as string,
        cmpName: (msg['cmpName'] as string | null) || null,
        gpcActive: (msg['gpcActive'] as boolean) || false,
        tcfConsentString: (msg['tcfConsentString'] as string | null) || null,
        tcfPurposeConsents: (msg['tcfPurposeConsents'] as string | null) || null,
        detectedAt: (msg['detectedAt'] as number | null) || null,
      });
      return false;
    }

    // Content script: storage write detected by storage-probe
    if (msg['type'] === 'storageWrite' && sender.tab?.id) {
      console.log(
        '[consent.watch] Storage write: ' + (msg['storageType'] as string) +
        ' key=' + (msg['key'] as string) + ' on tab=' + sender.tab.id
      );
      addStorageWrite(sender.tab.id, {
        storageType: msg['storageType'] as 'localStorage' | 'sessionStorage',
        key: msg['key'] as string,
        valueHash: msg['valueHash'] as string,
        valueLength: msg['valueLength'] as number,
        detectedAt: msg['detectedAt'] as number,
      });
      return false;
    }

    if (msg['type'] === 'getTabSummary') {
      browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
        var tabId = tabs[0]?.id;
        if (tabId === undefined) {
          sendResponse({ total: 0, preConsent: 0, postConsent: 0, domain: null });
          return;
        }
        sendResponse(getTabSummary(tabId));
      });
      return true;
    }

    if (msg['type'] === 'submitEvidence') {
      console.log('[consent.watch] Submitting evidence to API...');
      submitEvidence().then(function(result) {
        console.log('[consent.watch] Submit result:', result);
        sendResponse(result);
      }).catch(function(err) {
        console.error('[consent.watch] Submit failed:', err);
        sendResponse({ accepted: 0, rejected: 0, errors: [String(err)] });
      });
      return true;
    }

    // Popup: request policy claims for the current tab's domain
    if (msg['type'] === 'getPolicyClaims') {
      browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
        var tabUrl = tabs[0]?.url;
        if (!tabUrl) {
          sendResponse({ claims: [], undisclosed: [], policyUrl: null });
          return;
        }
        try {
          var domain = new URL(tabUrl).hostname.toLowerCase();
          var cached = policyClaimsCache.get(domain);
          sendResponse(cached || { claims: [], undisclosed: [], policyUrl: null });
        } catch (e) {
          sendResponse({ claims: [], undisclosed: [], policyUrl: null });
        }
      });
      return true;
    }

    if (msg['type'] === 'getPreConsentRequests') {
      browser.tabs.query({ active: true, currentWindow: true }).then(function(tabs) {
        var tabId = tabs[0]?.id;
        if (tabId === undefined) {
          sendResponse([]);
          return;
        }
        sendResponse(getPreConsentRequests(tabId));
      });
      return true;
    }

    return false;
  },
);

console.log('[consent.watch] Listeners registered');
