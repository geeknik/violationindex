/**
 * Content script: Detects tracker-related localStorage/sessionStorage writes.
 * Runs at document_start in the ISOLATED content script world.
 *
 * Uses Firefox's wrappedJSObject + exportFunction to intercept page-level
 * Storage.prototype.setItem calls without needing main-world script injection.
 *
 * Only reports writes with keys matching known tracker patterns.
 * Values are SHA-256 hashed before reporting — never sent in the clear.
 */

/** Patterns that match known tracker storage keys */
var TRACKER_KEY_PATTERNS: RegExp[] = [
  // Google
  /^_ga/, /^_gid/, /^_gat/, /^_gcl/, /^__gads/, /^__gpi/,
  // Facebook / Meta
  /^_fb/, /^_fbc/, /^_fbp/,
  // Microsoft
  /^_clck/, /^_clsk/, /^_uet/,
  // HubSpot
  /^__hstc/, /^__hssc/, /^__hsfp/, /^hubspot/,
  // Hotjar
  /^_hjid/, /^_hjSession/, /^_hjAbsolute/, /^_hjFirst/,
  // TikTok
  /^_tt_/, /^_ttp/,
  // Pinterest
  /^_pin_/, /^_epik/, /^_derived_epik/,
  // Snapchat
  /^_scid/, /^_sctr/, /^sc_at/,
  // Snowplow
  /^sp_/, /^_sp_/,
  // Segment / analytics.js
  /^ajs_/, /^analytics_/,
  // Amplitude
  /^amplitude/, /^amp_/,
  // Mixpanel
  /^mp_/, /^mixpanel/,
  // Optimizely
  /^optimizely/,
  // Criteo
  /^cto_/, /^criteo/,
  // Trade Desk
  /^ttd_/, /^TDID/,
  // Generic tracking patterns
  /^__utm/, /^_pk_/, /^_vis_opt_/, /^__adroll/,
  // LiveRamp
  /^_lr_/, /^rlcdn/,
  // ID5 / UID2
  /^id5/, /^uid2/,
];

function isTrackerKey(key: string): boolean {
  for (var i = 0; i < TRACKER_KEY_PATTERNS.length; i++) {
    if (TRACKER_KEY_PATTERNS[i].test(key)) return true;
  }
  return false;
}

/** SHA-256 hash using Web Crypto (available in content scripts) */
async function sha256(data: string): Promise<string> {
  var encoder = new TextEncoder();
  var buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  var hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/**
 * Install storage interception using Firefox's wrappedJSObject.
 * This gives content scripts access to the page's JS objects while keeping
 * the ability to call browser.runtime.sendMessage from the isolated world.
 */
function installStorageProxy(): void {
  var pageWindow = (window as unknown as { wrappedJSObject: Window }).wrappedJSObject;
  if (!pageWindow || !pageWindow.Storage) return;

  var originalSetItem = pageWindow.Storage.prototype.setItem;

  // Use Firefox's exportFunction to expose our interceptor to the page world
  var exportFn = (window as unknown as Record<string, unknown>)['exportFunction'] as
    ((fn: Function, target: object, opts: { defineAs: string }) => void) | undefined;

  if (typeof exportFn !== 'function') {
    // exportFunction not available — can't intercept. This is a no-op on non-Firefox.
    return;
  }

  exportFn(function(this: Storage, key: string, value: string) {
    // Call original first to avoid breaking page functionality
    originalSetItem.call(this, key, value);

    // Check if this looks like a tracker key
    if (typeof key === 'string' && isTrackerKey(key)) {
      var storageType: 'localStorage' | 'sessionStorage' = 'localStorage';
      try {
        if (this === pageWindow.sessionStorage) {
          storageType = 'sessionStorage';
        }
      } catch (e) {
        // SecurityError on cross-origin — default to localStorage
      }

      sha256(String(value)).then(function(hash) {
        browser.runtime.sendMessage({
          type: 'storageWrite',
          storageType: storageType,
          key: key,
          valueHash: hash,
          valueLength: String(value).length,
          detectedAt: Date.now(),
        }).catch(function() {
          // Extension context may be invalidated
        });
      }).catch(function() {
        // SHA-256 failed — skip this write
      });
    }
  }, pageWindow.Storage.prototype, { defineAs: 'setItem' });
}

// Install immediately at document_start
try {
  installStorageProxy();
} catch (e) {
  // Fail silently — don't break pages if interception fails
}
