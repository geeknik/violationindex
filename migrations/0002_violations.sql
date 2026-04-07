-- Violation Index: Violations table + evidence linking
-- Confirmed violations with accountability clock state

CREATE TABLE IF NOT EXISTS violations (
    id TEXT PRIMARY KEY,
    site_domain TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unreviewed',
    evidence_count INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    first_observed TEXT NOT NULL,
    last_observed TEXT NOT NULL,
    clock_started_at TEXT,
    response_deadline TEXT,
    resolved_at TEXT,
    jurisdiction TEXT,
    estimated_users INTEGER,
    estimated_exposure_min INTEGER,
    estimated_exposure_max INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (violation_type IN ('preconsent_marketing_transfer', 'gpc_ignored')),
    CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    CHECK (status IN ('unreviewed', 'confirmed', 'active', 'remediated', 'disputed', 'escalated_tier2'))
);

CREATE INDEX IF NOT EXISTS idx_violations_domain ON violations(site_domain);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
