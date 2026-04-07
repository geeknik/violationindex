-- Violation Index: Initial D1 Schema
-- Evidence submissions from extension
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    site_domain TEXT NOT NULL,
    observed_url TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    consent_state TEXT NOT NULL,
    request_type TEXT NOT NULL,
    request_destination TEXT NOT NULL,
    evidence_hash TEXT NOT NULL,
    policy_snapshot_id TEXT,
    session_id TEXT NOT NULL,
    installation_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'unreviewed',
    CHECK (consent_state IN ('pre_consent', 'post_consent', 'no_mechanism')),
    CHECK (request_type IN ('tracker', 'marketing', 'analytics')),
    CHECK (status IN ('unreviewed', 'confirmed', 'rejected', 'disputed'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_domain ON evidence(site_domain);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status);
CREATE INDEX IF NOT EXISTS idx_evidence_observed ON evidence(observed_at);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence(evidence_hash);

-- Privacy policy snapshots (hashes only, no content stored)
CREATE TABLE IF NOT EXISTS policy_snapshots (
    id TEXT PRIMARY KEY,
    site_domain TEXT NOT NULL,
    policy_url TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    claims_extracted TEXT
);

CREATE INDEX IF NOT EXISTS idx_policy_domain ON policy_snapshots(site_domain);
CREATE INDEX IF NOT EXISTS idx_policy_hash ON policy_snapshots(content_hash);

-- Immutable, hash-chained audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,
    prev_hash TEXT,
    entry_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
