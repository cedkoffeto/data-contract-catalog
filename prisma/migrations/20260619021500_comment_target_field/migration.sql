ALTER TABLE contract_comments ADD COLUMN target_field TEXT;

CREATE INDEX IF NOT EXISTS idx_contract_comments_target_field ON contract_comments(contract_slug, target_field);
