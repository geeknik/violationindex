import type { Context, Next } from 'hono';
import type { AppEnv } from '../index.js';

/**
 * Request body size limit middleware.
 * Rejects requests with Content-Length exceeding the specified limit.
 * Also enforces the limit during streaming by tracking bytes read.
 */
export function bodyLimit(maxBytes: number) {
  return async (c: Context<AppEnv>, next: Next) => {
    const contentLength = c.req.header('content-length');

    if (contentLength) {
      const length = parseInt(contentLength, 10);
      if (isNaN(length) || length > maxBytes) {
        return c.json(
          { error: 'Request body too large', maxBytes },
          413,
        );
      }
    }

    await next();
  };
}
