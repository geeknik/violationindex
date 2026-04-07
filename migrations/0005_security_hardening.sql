-- Security hardening migration
-- Fixes: UNIQUE constraint on evidence_hash (prevents race-condition duplicates)
-- Fixes: UNIQUE constraint on policy_snapshots content_hash+site_domain
-- Adds: LIMIT-friendly index for public violations query

-- Add UNIQUE constraint on evidence_hash to prevent duplicate evidence at the DB level.
-- DROP the old non-unique index and recreate as unique.
DROP INDEX IF EXISTS idx_evidence_hash;
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_hash_unique ON evidence(evidence_hash);

-- Add UNIQUE constraint on policy_snapshots (content_hash, site_domain) for dedup safety.
DROP INDEX IF EXISTS idx_policy_hash;
CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_hash_domain_unique ON policy_snapshots(content_hash, site_domain);

-- Composite index for the public violations query to avoid full table scans.
CREATE INDEX IF NOT EXISTS idx_violations_public ON violations(status, severity, evidence_count);
