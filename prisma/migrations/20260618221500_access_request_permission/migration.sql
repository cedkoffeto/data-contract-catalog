ALTER TABLE access_requests ADD COLUMN requested_permission TEXT NOT NULL DEFAULT 'reader';
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_permission ON access_requests(requested_permission);
