ALTER TABLE notifications ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS comment_mentions (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id),
    FOREIGN KEY (comment_id) REFERENCES contract_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_user_id ON comment_mentions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
