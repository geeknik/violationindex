import { sha256 } from '@violation-index/shared/crypto';
import type { PolicyClaim } from '@violation-index/shared/types';
import { extractPolicyClaims } from './policy-analyzer.js';

/**
 * Fallback paths — only used if the content script didn't find a policy link in the DOM.
 * Kept minimal to avoid unnecessary requests.
 */
const FALLBACK_PATHS = [
  '/privacy-policy',
  '/privacy',
] as const;

export interface LocalPolicySnapshot {
  readonly siteDomain: string;
  readonly policyUrl: string;
  readonly contentHash: string;
  readonly fetchedAt: string;
  readonly contentLength: number;
  /** Structured claims extracted from the policy text */
  readonly claimsExtracted: readonly PolicyClaim[];
  /** Raw plaintext (kept in memory only, never sent to API) */
  readonly plaintext: string;
}

/**
 * Attempt to find and snapshot a site's privacy policy.
 *
 * Strategy (ordered by intelligence):
 * 1. Ask the content script to find a privacy policy link in the page DOM.
 *    Most sites link to their policy from the footer — this avoids any blind probing.
 * 2. If no link found, try 2 common fallback paths.
 *
 * Fetches the content, strips HTML, extracts structured claims,
 * and returns a SHA-256 hash. No raw content is stored server-side.
 */
export async function snapshotPolicy(
  siteDomain: string,
  tabId?: number,
): Promise<LocalPolicySnapshot | null> {
  // Strategy 1: Ask the content script for the policy URL
  if (tabId !== undefined) {
    try {
      var domUrl = await browser.tabs.sendMessage(tabId, { type: 'findPolicyUrl' }) as string | null;
      if (domUrl) {
        console.log('[consent.watch] Policy URL found in DOM: ' + domUrl);
        var result = await fetchAndAnalyze(siteDomain, domUrl);
        if (result) return result;
      }
    } catch (e) {
      // Content script may not be ready or tab may be restricted
    }
  }

  // Strategy 2: Minimal fallback probing (2 paths only)
  var baseUrl = 'https://' + siteDomain;
  for (var i = 0; i < FALLBACK_PATHS.length; i++) {
    var url = baseUrl + FALLBACK_PATHS[i];
    var result2 = await fetchAndAnalyze(siteDomain, url);
    if (result2) return result2;
  }

  return null;
}

/**
 * Fetch a URL, verify it's a privacy policy, strip HTML, extract claims.
 */
async function fetchAndAnalyze(
  siteDomain: string,
  url: string,
): Promise<LocalPolicySnapshot | null> {
  try {
    var response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    var contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;

    var html = await response.text();
    if (html.length < 200) return null;

    var plaintext = stripHtml(html);
    if (plaintext.length < 100) return null;

    if (!looksLikePrivacyPolicy(plaintext)) return null;

    var contentHash = await sha256(plaintext);
    var claimsExtracted = extractPolicyClaims(plaintext);

    return {
      siteDomain: siteDomain,
      policyUrl: response.url,
      contentHash: contentHash,
      fetchedAt: new Date().toISOString(),
      contentLength: plaintext.length,
      claimsExtracted: claimsExtracted,
      plaintext: plaintext,
    };
  } catch (e) {
    return null;
  }
}

/** Strip HTML tags and normalize whitespace */
function stripHtml(html: string): string {
  var text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/** Basic heuristic: does this text look like a privacy policy? */
function looksLikePrivacyPolicy(text: string): boolean {
  var lower = text.toLowerCase();
  var signals = [
    'privacy policy',
    'personal data',
    'personal information',
    'cookies',
    'third party',
    'data processing',
    'data collection',
    'opt out',
    'opt-out',
    'gdpr',
    'ccpa',
    'california consumer',
  ];

  var matchCount = 0;
  for (var i = 0; i < signals.length; i++) {
    if (lower.indexOf(signals[i]) !== -1) matchCount++;
  }
  return matchCount >= 3;
}
