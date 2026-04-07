import type { Context, Next } from 'hono';
import type { AppEnv } from '../index.js';

/**
 * IP restriction middleware for write endpoints.
 * Only allows requests from authorized IPs via CF-Connecting-IP header.
 *
 * SECURITY NOTES:
 * - Origin headers are attacker-controlled in non-browser contexts — never trust them for authz.
 * - Extension requests route through Cloudflare and carry the owner's CF-Connecting-IP.
 * - Allowed IPs are loaded from environment variables, not hardcoded in source.
 */

function getAllowedIps(c: Context<AppEnv>): readonly string[] {
  const raw = c.env.ALLOWED_IPS;
  if (!raw) return [];
  return raw.split(',').map((ip) => ip.trim()).filter(Boolean);
}

export function ipRestrict() {
  return async (c: Context<AppEnv>, next: Next) => {
    // CF-Connecting-IP is set by Cloudflare and cannot be spoofed by the client.
    // Only trust this header — never fall back to X-Forwarded-For which is attacker-controlled.
    const clientIp = c.req.header('cf-connecting-ip') ?? '';

    if (!clientIp) {
      console.log('[ip-restrict] Blocked: no CF-Connecting-IP header');
      return c.json({ error: 'Forbidden' }, 403);
    }

    const allowedIps = getAllowedIps(c);

    if (allowedIps.length === 0) {
      console.log('[ip-restrict] Blocked: ALLOWED_IPS not configured');
      return c.json({ error: 'Forbidden' }, 403);
    }

    if (!allowedIps.includes(clientIp)) {
      // Log IP prefix only — not full IP (privacy)
      const ipPrefix = clientIp.includes(':')
        ? clientIp.split(':').slice(0, 4).join(':') + ':*'
        : clientIp.split('.').slice(0, 2).join('.') + '.*.*';
      console.log('[ip-restrict] Blocked: ip_prefix=' + ipPrefix);
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}
