import { Hono } from 'hono';
import type { AppEnv } from '../index.js';

export const healthRoute = new Hono<AppEnv>();

healthRoute.get('/health', (c) => {
  return c.json({
    status: 'ok' as const,
    version: c.env.API_VERSION,
  });
});
