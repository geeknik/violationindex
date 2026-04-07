-- Evidence chain hardening: consent metadata per evidence record
ALTER TABLE evidence ADD COLUMN gpc_active INTEGER NOT NULL DEFAULT 0;
ALTER TABLE evidence ADD COLUMN consent_mechanism TEXT NOT NULL DEFAULT 'none';
ALTER TABLE evidence ADD COLUMN cmp_name TEXT;
ALTER TABLE evidence ADD COLUMN tcf_consent_string TEXT;
