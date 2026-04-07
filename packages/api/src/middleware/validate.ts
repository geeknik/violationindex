import type { Context, Next } from 'hono';
import type { ZodSchema, ZodError } from 'zod';
import type { AppEnv } from '../index.js';

/**
 * Middleware that validates the request body against a Zod schema.
 * Fails closed: malformed input returns 400 with structured errors.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context<AppEnv>, next: Next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return c.json({ error: 'Validation failed', details: errors }, 400);
    }

    c.set('validatedBody', result.data);
    await next();
  };
}

function formatZodErrors(error: ZodError): readonly string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
