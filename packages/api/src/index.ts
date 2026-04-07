import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRoute } from './routes/health.js';
import { ingestRoute } from './routes/ingest.js';
import { auditRoute } from './routes/audit.js';
import { policySnapshotRoute } from './routes/policy-snapshot.js';
import { rulesRoute } from './routes/rules.js';
import { violationsRoute } from './routes/violations.js';
import { evidenceQueryRoute } from './routes/evidence-query.js';
import { distributionRoute } from './routes/distribution.js';
import { ipRestrict } from './middleware/ip-restrict.js';
import { bodyLimit } from './middleware/body-limit.js';

export interface Env {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  API_VERSION: string;
  ENVIRONMENT: string;
  ANALYST_TOKEN: string;
  ALLOWED_IPS: string;  // Comma-separated list of allowed IPs for write endpoints
}

export interface AppVariables {
  validatedBody: unknown;
}

export type AppEnv = { Bindings: Env; Variables: AppVariables };

const app = new Hono<AppEnv>();

// Global body size limit: 512KB for all endpoints
app.use('*', bodyLimit(512 * 1024));

app.use('*', cors({
  origin: [
    'https://violationindex.com',
    'https://www.violationindex.com',
    'https://console.violationindex.com',
    'https://consent.watch',
    'https://datamisconduct.com',
    'https://api.violationindex.com',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Public read endpoints — no IP restriction
app.route('/api/v1', healthRoute);
app.route('/api/v1', auditRoute);
app.route('/api/v1', violationsRoute);  // /violations/public is open, others have analyst auth

// Write endpoints — IP restricted
app.use('/api/v1/evidence', ipRestrict());
app.use('/api/v1/policy-snapshot', ipRestrict());
app.route('/api/v1', ingestRoute);
app.route('/api/v1', policySnapshotRoute);

// Analyst endpoints — IP restricted + bearer token auth
app.route('/api/v1', rulesRoute);
app.route('/api/v1', evidenceQueryRoute);
app.route('/api/v1', distributionRoute);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error: ' + err.message);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
