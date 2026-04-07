import { sha256 } from '@violation-index/shared/crypto';

/** Common privacy policy URL paths to probe */
const POLICY_PATHS = [
  '/privacy-policy',
  '/privacy',
  '/legal/privacy',
  '/about/privacy',
  '/policies/privacy',
  '/privacy-policy.html',
] as const;

export interface LocalPolicySnapshot {
  readonly siteDomain: string;
  readonly policyUrl: string;
  readonly contentHash: string;
  readonly fetchedAt: string;
  readonly contentLength: number;
}

/**
 * Attempt to find and snapshot a site's privacy policy.
 * Probes common policy URL paths, fetches the content,
 * strips HTML, and returns a SHA-256 hash.
 *
 * No content is stored — only the hash for chain of custody.
 */
export async function snapshotPolicy(siteDomain: string): Promise<LocalPolicySnapshot | null> {
  const baseUrl = `https://${siteDomain}`;

  for (const path of POLICY_PATHS) {
    const url = `${baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) continue;

      const html = await response.text();
      if (html.length < 200) continue; // Too short to be a real policy

      const plaintext = stripHtml(html);
      if (plaintext.length < 100) continue;

      // Check if this actually looks like a privacy policy
      if (!looksLikePrivacyPolicy(plaintext)) continue;

      const contentHash = await sha256(plaintext);

      return {
        siteDomain,
        policyUrl: response.url, // Use final URL after redirects
        contentHash,
        fetchedAt: new Date().toISOString(),
        contentLength: plaintext.length,
      };
    } catch {
      // Network error, timeout, etc. — try next path
      continue;
    }
  }

  return null;
}

/** Strip HTML tags and normalize whitespace */
function stripHtml(html: string): string {
  // Remove script and style contents
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/** Basic heuristic: does this text look like a privacy policy? */
function looksLikePrivacyPolicy(text: string): boolean {
  const lower = text.toLowerCase();
  const signals = [
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

  const matchCount = signals.filter((s) => lower.includes(s)).length;
  return matchCount >= 3;
}
