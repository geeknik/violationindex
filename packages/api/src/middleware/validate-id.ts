import type { Context, Next } from 'hono';
import type { AppEnv } from '../index.js';

/**
 * ULID-like ID format: 26 uppercase alphanumeric characters.
 * Matches the generateId() output format.
 */
const ID_PATTERN = /^[0-9A-Z]{20,26}$/;

/**
 * Validates that the :id path parameter matches the expected ULID-like format.
 * Prevents unnecessary database queries from malformed IDs.
 */
export function validateId(paramName: string = 'id') {
  return async (c: Context<AppEnv>, next: Next) => {
    const id = c.req.param(paramName);
    if (!id || !ID_PATTERN.test(id)) {
      return c.json({ error: 'Invalid ID format' }, 400);
    }
    await next();
  };
}
