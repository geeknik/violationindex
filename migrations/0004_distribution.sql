-- Distribution Engine: artifact storage
CREATE TABLE IF NOT EXISTS distribution_artifacts (
    id TEXT PRIMARY KEY,
    violation_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'markdown',
    content TEXT,
    content_hash TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    download_count INTEGER NOT NULL DEFAULT 0,
    CHECK (artifact_type IN ('dossier', 'journalist_brief', 'social_payload', 'regulator_packet', 'plaintiff_packet'))
);
CREATE INDEX IF NOT EXISTS idx_artifacts_violation ON distribution_artifacts(violation_id);
