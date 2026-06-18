CREATE TABLE IF NOT EXISTS contract_issues (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    contract_slug TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_contract_issues_contract_slug ON contract_issues(contract_slug, created_at, id);
CREATE INDEX IF NOT EXISTS idx_contract_issues_status ON contract_issues(status);
