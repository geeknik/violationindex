import type { Context, Next } from 'hono';
import type { AppEnv } from '../index.js';

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 * Both strings are encoded to fixed-length byte arrays and compared byte-by-byte.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);

  // Length difference must not short-circuit — pad to same length
  const maxLen = Math.max(aBuf.length, bBuf.length);
  if (maxLen === 0) return false;

  let mismatch = aBuf.length !== bBuf.length ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    // Use 0 for out-of-bounds to avoid short-circuiting on length
    mismatch |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
  }
  return mismatch === 0;
}

/**
 * Analyst authentication middleware.
 * Requires Bearer token matching the ANALYST_TOKEN secret.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function analystAuth() {
  return async (c: Context<AppEnv>, next: Next) => {
    const authHeader = c.req.header('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authorization required' }, 401);
    }

    const token = authHeader.slice(7);
    const expected = c.env.ANALYST_TOKEN;

    if (!expected || !constantTimeEqual(token, expected)) {
      return c.json({ error: 'Invalid token' }, 403);
    }

    await next();
  };
}
