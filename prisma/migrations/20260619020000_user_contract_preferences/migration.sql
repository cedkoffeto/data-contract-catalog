CREATE TABLE IF NOT EXISTS user_contract_preferences (
    user_id TEXT NOT NULL,
    contract_slug TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contract_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_contract_preferences_user_id ON user_contract_preferences(user_id);
