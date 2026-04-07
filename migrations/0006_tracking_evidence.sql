-- Tracking evidence enrichment: captures HOW tracking occurs, not just THAT it occurs.
-- Cookies sent/received, URL tracking parameters, storage writes, request metadata.

ALTER TABLE evidence ADD COLUMN request_method TEXT;
ALTER TABLE evidence ADD COLUMN has_request_body INTEGER NOT NULL DEFAULT 0;
ALTER TABLE evidence ADD COLUMN request_content_type TEXT;
ALTER TABLE evidence ADD COLUMN sent_cookie_names TEXT;   -- JSON array of cookie names sent to tracker
ALTER TABLE evidence ADD COLUMN set_cookie_names TEXT;    -- JSON array of cookie names set by tracker response
ALTER TABLE evidence ADD COLUMN tracking_params TEXT;     -- JSON array of {name, value, paramType}
ALTER TABLE evidence ADD COLUMN storage_writes TEXT;      -- JSON array of storage write evidence
