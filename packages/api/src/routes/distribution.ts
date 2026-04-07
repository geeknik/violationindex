import { Hono } from 'hono';
import type { AppEnv } from '../index.js';
import { analystAuth } from '../middleware/analyst-auth.js';
import { ipRestrict } from '../middleware/ip-restrict.js';
import { validateId } from '../middleware/validate-id.js';
import { generateAllArtifacts } from '../distribution/engine.js';
import { appendAuditEntry } from '../audit-log.js';

/** Sanitize a string for use in Content-Disposition filename. Only allow alphanumeric, dash, underscore. */
function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

export const distributionRoute = new Hono<AppEnv>();

/**
 * POST /api/v1/violations/:id/generate
 * Analyst-triggered: generates all 5 distribution artifacts.
 */
distributionRoute.post('/violations/:id/generate', ipRestrict(), analystAuth(), validateId(), async (c) => {
  const db = c.env.DB;
  const violationId = c.req.param('id');

  try {
    var artifacts = await generateAllArtifacts(db, violationId);

    await appendAuditEntry(db, {
      action: 'violation_status_changed',
      entityType: 'violation',
      entityId: violationId,
      actor: 'analyst',
      details: {
        action: 'distribution_generated',
        artifactCount: artifacts.length,
        types: artifacts.map(function(a) { return a.artifactType; }),
      },
    });

    return c.json({
      violationId: violationId,
      artifacts: artifacts,
      generated: artifacts.length,
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Distribution generation error: ' + message);
    return c.json({ error: message }, err instanceof Error && err.message.includes('not found') ? 404 : 500);
  }
});

/**
 * GET /api/v1/violations/:id/artifacts
 * List generated artifacts for a violation.
 */
distributionRoute.get('/violations/:id/artifacts', ipRestrict(), analystAuth(), validateId(), async (c) => {
  const db = c.env.DB;
  const violationId = c.req.param('id');

  var rows = await db
    .prepare(
      'SELECT id, artifact_type, format, content_hash, generated_at, download_count FROM distribution_artifacts WHERE violation_id = ? ORDER BY artifact_type',
    )
    .bind(violationId)
    .all();

  return c.json({ violationId: violationId, artifacts: rows.results });
});

/**
 * GET /api/v1/violations/:id/artifacts/:type
 * Download a specific artifact.
 */
distributionRoute.get('/violations/:id/artifacts/:type', ipRestrict(), analystAuth(), validateId(), async (c) => {
  const db = c.env.DB;
  const violationId = c.req.param('id');
  const artifactType = c.req.param('type');

  var allowed = ['dossier', 'journalist_brief', 'social_payload', 'regulator_packet', 'plaintiff_packet'];
  if (!allowed.includes(artifactType)) {
    return c.json({ error: 'Invalid artifact type' }, 400);
  }

  var artifact = await db
    .prepare('SELECT * FROM distribution_artifacts WHERE violation_id = ? AND artifact_type = ?')
    .bind(violationId, artifactType)
    .first<{ content: string; download_count: number; id: string }>();

  if (!artifact) {
    return c.json({ error: 'Artifact not found. Run generate first.' }, 404);
  }

  // Increment download count
  await db
    .prepare('UPDATE distribution_artifacts SET download_count = download_count + 1 WHERE id = ?')
    .bind(artifact.id)
    .run();

  // Return as markdown with sanitized filename
  c.header('Content-Type', 'text/markdown; charset=utf-8');
  const safeFilename = sanitizeFilename(violationId) + '-' + sanitizeFilename(artifactType) + '.md';
  c.header('Content-Disposition', 'inline; filename="' + safeFilename + '"');
  return c.body(artifact.content);
});
