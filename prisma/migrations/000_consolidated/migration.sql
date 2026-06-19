-- Consolidated schema: init + fine-grained access control
-- Created by merging 20260615141647_init and 20260615150000_fine_grained_access

-- Roles (legacy)
CREATE TABLE IF NOT EXISTS "roles" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- User roles (legacy)
CREATE TABLE IF NOT EXISTS "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("user_id", "role_name"),
    CONSTRAINT "user_roles_role_name_fkey" FOREIGN KEY ("role_name") REFERENCES "roles" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_roles_user_id_idx" ON "user_roles"("user_id");

-- Permissions (fixed set: admin, editor, reader)
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO "permissions" ("name") VALUES ('admin'), ('editor'), ('reader');

-- Groups
CREATE TABLE IF NOT EXISTS "groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE
);

-- User-group (Many-to-Many)
CREATE TABLE IF NOT EXISTS "user_group" (
    "user_id" TEXT NOT NULL,
    "group_id" INTEGER NOT NULL,
    PRIMARY KEY ("user_id", "group_id"),
    CONSTRAINT "user_group_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_group_user_id_idx" ON "user_group"("user_id");
CREATE INDEX IF NOT EXISTS "user_group_group_id_idx" ON "user_group"("group_id");

-- Access policies (Fine-Grained Access Control)
CREATE TABLE IF NOT EXISTS "access_policies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT,
    "group_id" INTEGER,
    "permission_id" INTEGER NOT NULL,
    "domain_scope" TEXT,
    "context_scope" TEXT,
    "data_contract_scope" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_policies_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "access_policies_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "either_user_or_group" CHECK (
        ("user_id" IS NOT NULL AND "group_id" IS NULL)
        OR
        ("user_id" IS NULL AND "group_id" IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS "access_policies_user_id_idx" ON "access_policies"("user_id");
CREATE INDEX IF NOT EXISTS "access_policies_group_id_idx" ON "access_policies"("group_id");
CREATE INDEX IF NOT EXISTS "access_policies_permission_id_idx" ON "access_policies"("permission_id");
CREATE INDEX IF NOT EXISTS "access_policies_domain_scope_idx" ON "access_policies"("domain_scope");
CREATE INDEX IF NOT EXISTS "access_policies_context_scope_idx" ON "access_policies"("context_scope");
CREATE INDEX IF NOT EXISTS "access_policies_data_contract_scope_idx" ON "access_policies"("data_contract_scope");
CREATE INDEX IF NOT EXISTS "access_policies_lookup_idx" ON "access_policies"("domain_scope", "context_scope", "data_contract_scope", "permission_id");

-- Audit log
CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "session_id" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "audit_log_actor_id_idx" ON "audit_log"("actor_id");
CREATE INDEX IF NOT EXISTS "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log"("created_at");

-- Subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "user_id" TEXT NOT NULL,
    "contract_slug" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("user_id", "contract_slug")
);

CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_contract_slug_idx" ON "subscriptions"("contract_slug");

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "contract_slug" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "is_read" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

CREATE TABLE IF NOT EXISTS "access_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '',
    "data_contract" TEXT NOT NULL DEFAULT '',
    "requested_permission" TEXT NOT NULL DEFAULT 'reader',
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "access_requests_status_idx" ON "access_requests"("status");
CREATE INDEX IF NOT EXISTS "access_requests_user_id_idx" ON "access_requests"("user_id");
CREATE INDEX IF NOT EXISTS "access_requests_requested_permission_idx" ON "access_requests"("requested_permission");

CREATE TABLE IF NOT EXISTS "contract_comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_slug" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" DATETIME,
    CONSTRAINT "contract_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "contract_comments"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "contract_comments_contract_slug_idx" ON "contract_comments"("contract_slug", "created_at", "id");
CREATE INDEX IF NOT EXISTS "contract_comments_parent_id_idx" ON "contract_comments"("parent_id");

CREATE TABLE IF NOT EXISTS "comment_mentions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comment_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_mentions_comment_id_user_id_unique" UNIQUE ("comment_id", "user_id"),
    CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "contract_comments"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "comment_mentions_user_id_idx" ON "comment_mentions"("user_id");
CREATE INDEX IF NOT EXISTS "comment_mentions_comment_id_idx" ON "comment_mentions"("comment_id");

CREATE TABLE IF NOT EXISTS "contract_issues" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_slug" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" DATETIME
);

CREATE INDEX IF NOT EXISTS "contract_issues_contract_slug_idx" ON "contract_issues"("contract_slug", "created_at", "id");
CREATE INDEX IF NOT EXISTS "contract_issues_status_idx" ON "contract_issues"("status");

CREATE TABLE IF NOT EXISTS "user_profiles" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user_contract_preferences" (
    "user_id" TEXT NOT NULL,
    "contract_slug" TEXT NOT NULL,
    "is_favorite" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("user_id", "contract_slug")
);

CREATE INDEX IF NOT EXISTS "user_contract_preferences_user_id_idx" ON "user_contract_preferences"("user_id");
CREATE INDEX IF NOT EXISTS "user_contract_preferences_pinned_idx" ON "user_contract_preferences"("is_pinned", "contract_slug");

-- User preferences (notification channel, etc.)
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "notification_channel" TEXT NOT NULL DEFAULT 'in_app',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
