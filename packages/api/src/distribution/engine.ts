import { sha256 } from '@violation-index/shared';
import type { ViolationBundle, ArtifactType } from './types.js';
import { generateDossier } from './dossier.js';
import { generateJournalistBrief } from './journalist-brief.js';
import { generateSocialPayload } from './social-payload.js';
import { generateRegulatorPacket } from './regulator-packet.js';
import { generatePlaintiffPacket } from './plaintiff-packet.js';
import { generateId } from '../db/queries.js';

interface GeneratedArtifact {
  id: string;
  artifactType: ArtifactType;
  contentHash: string;
  contentLength: number;
}

/**
 * Load all data needed for distribution artifact generation.
 */
export async function loadViolationBundle(db: D1Database, violationId: string): Promise<ViolationBundle | null> {
  var violation = await db
    .prepare('SELECT * FROM violations WHERE id = ?')
    .bind(violationId)
    .first();

  if (!violation) return null;

  var evidence = await db
    .prepare('SELECT * FROM evidence WHERE violation_id = ? ORDER BY observed_at')
    .bind(violationId)
    .all();

  var siteDomain = violation['site_domain'] as string;

  var policySnapshots = await db
    .prepare('SELECT * FROM policy_snapshots WHERE site_domain = ? ORDER BY fetched_at DESC')
    .bind(siteDomain)
    .all();

  var auditTrail = await db
    .prepare("SELECT * FROM audit_log WHERE entity_type = 'violation' AND entity_id = ? ORDER BY id")
    .bind(violationId)
    .all();

  // Also get audit entries for linked evidence
  var evidenceIds = evidence.results.map(function(e: Record<string, unknown>) { return e['id'] as string; });
  var evidenceAudit = { results: [] as Record<string, unknown>[] };
  if (evidenceIds.length > 0) {
    evidenceAudit = await db
      .prepare("SELECT * FROM audit_log WHERE entity_type = 'evidence' AND entity_id IN (" +
        evidenceIds.map(function() { return '?'; }).join(',') + ') ORDER BY id')
      .bind(...evidenceIds)
      .all();
  }

  var allAudit = auditTrail.results.concat(evidenceAudit.results);
  allAudit.sort(function(a: Record<string, unknown>, b: Record<string, unknown>) {
    return (a['id'] as number) - (b['id'] as number);
  });

  return {
    violation: violation as unknown as ViolationBundle['violation'],
    evidence: evidence.results as unknown as ViolationBundle['evidence'],
    policySnapshots: policySnapshots.results as unknown as ViolationBundle['policySnapshots'],
    auditTrail: allAudit as unknown as ViolationBundle['auditTrail'],
  };
}

/**
 * Generate all 5 distribution artifacts for a violation.
 * Stores content in D1, returns metadata.
 */
export async function generateAllArtifacts(
  db: D1Database,
  violationId: string,
): Promise<GeneratedArtifact[]> {
  var bundle = await loadViolationBundle(db, violationId);
  if (!bundle) throw new Error('Violation not found: ' + violationId);

  var generators: { type: ArtifactType; fn: (b: ViolationBundle) => string }[] = [
    { type: 'dossier', fn: generateDossier },
    { type: 'journalist_brief', fn: generateJournalistBrief },
    { type: 'social_payload', fn: generateSocialPayload },
    { type: 'regulator_packet', fn: generateRegulatorPacket },
    { type: 'plaintiff_packet', fn: generatePlaintiffPacket },
  ];

  var results: GeneratedArtifact[] = [];

  for (var i = 0; i < generators.length; i++) {
    var gen = generators[i]!;
    var content = gen.fn(bundle);
    var contentHash = await sha256(content);
    var id = generateId();

    // Upsert: delete existing artifact of same type for this violation
    await db
      .prepare('DELETE FROM distribution_artifacts WHERE violation_id = ? AND artifact_type = ?')
      .bind(violationId, gen.type)
      .run();

    await db
      .prepare(
        `INSERT INTO distribution_artifacts (id, violation_id, artifact_type, content, content_hash)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, violationId, gen.type, content, contentHash)
      .run();

    results.push({
      id: id,
      artifactType: gen.type,
      contentHash: contentHash,
      contentLength: content.length,
    });
  }

  return results;
}
