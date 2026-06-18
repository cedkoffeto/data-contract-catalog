CREATE TABLE IF NOT EXISTS contract_comments (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    contract_slug TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at DATETIME,
    FOREIGN KEY (parent_id) REFERENCES contract_comments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_contract_comments_contract_slug ON contract_comments(contract_slug, created_at, id);
CREATE INDEX IF NOT EXISTS idx_contract_comments_parent_id ON contract_comments(parent_id);
