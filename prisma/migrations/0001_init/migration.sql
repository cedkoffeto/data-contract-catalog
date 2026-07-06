-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_contract_preferences" (
    "user_id" TEXT NOT NULL,
    "contract_slug" TEXT NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,

    PRIMARY KEY ("user_id", "contract_slug")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" TEXT NOT NULL PRIMARY KEY,
    "notification_channel" TEXT NOT NULL DEFAULT 'in_app',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "session_id" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "user_id" TEXT NOT NULL,
    "contract_slug" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("user_id", "contract_slug")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "contract_slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "user_group" (
    "user_id" TEXT NOT NULL,
    "group_id" INTEGER NOT NULL,

    PRIMARY KEY ("user_id", "group_id"),
    CONSTRAINT "user_group_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contract_issues" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_slug" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" DATETIME
);

-- CreateTable
CREATE TABLE "contract_comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_slug" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parent_id" INTEGER,
    "target_field" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" DATETIME,
    CONSTRAINT "contract_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "contract_comments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comment_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "contract_comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contract_change_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_slug" TEXT NOT NULL,
    "editor_id" TEXT NOT NULL,
    "yaml_content" TEXT NOT NULL,
    "original_sha" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gitlab_mr_id" INTEGER,
    "gitlab_mr_url" TEXT NOT NULL DEFAULT '',
    "rejection_reason" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'app',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    "resolved_at" DATETIME,
    "resolved_by" TEXT
);

-- CreateTable
CREATE TABLE "access_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '',
    "data_contract" TEXT NOT NULL DEFAULT '',
    "requested_permission" TEXT NOT NULL DEFAULT 'reader',
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "access_policies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT,
    "group_id" INTEGER,
    "permission_id" INTEGER NOT NULL,
    "domain_scope" TEXT,
    "context_scope" TEXT,
    "data_contract_scope" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "access_policies_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "access_policies_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "user_contract_preferences_user_id_idx" ON "user_contract_preferences"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_contract_preferences_pinned" ON "user_contract_preferences"("user_id", "is_pinned");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_contract_slug_idx" ON "subscriptions"("contract_slug");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "user_group_user_id_idx" ON "user_group"("user_id");

-- CreateIndex
CREATE INDEX "user_group_group_id_idx" ON "user_group"("group_id");

-- CreateIndex
CREATE INDEX "contract_issues_contract_slug_created_at_id_idx" ON "contract_issues"("contract_slug", "created_at", "id");

-- CreateIndex
CREATE INDEX "contract_issues_status_idx" ON "contract_issues"("status");

-- CreateIndex
CREATE INDEX "contract_comments_contract_slug_created_at_id_idx" ON "contract_comments"("contract_slug", "created_at", "id");

-- CreateIndex
CREATE INDEX "contract_comments_parent_id_idx" ON "contract_comments"("parent_id");

-- CreateIndex
CREATE INDEX "idx_contract_comments_parent_id_id" ON "contract_comments"("parent_id", "id");

-- CreateIndex
CREATE INDEX "idx_contract_comments_target_field" ON "contract_comments"("contract_slug", "target_field");

-- CreateIndex
CREATE INDEX "comment_mentions_user_id_idx" ON "comment_mentions"("user_id");

-- CreateIndex
CREATE INDEX "comment_mentions_comment_id_idx" ON "comment_mentions"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_mentions_comment_id_user_id_key" ON "comment_mentions"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_change_requests_status" ON "contract_change_requests"("status");

-- CreateIndex
CREATE INDEX "idx_change_requests_slug" ON "contract_change_requests"("contract_slug");

-- CreateIndex
CREATE INDEX "idx_change_requests_editor" ON "contract_change_requests"("editor_id");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_user_id_idx" ON "access_requests"("user_id");

-- CreateIndex
CREATE INDEX "access_requests_requested_permission_idx" ON "access_requests"("requested_permission");

-- CreateIndex
CREATE INDEX "access_policies_user_id_idx" ON "access_policies"("user_id");

-- CreateIndex
CREATE INDEX "access_policies_group_id_idx" ON "access_policies"("group_id");

-- CreateIndex
CREATE INDEX "access_policies_permission_id_idx" ON "access_policies"("permission_id");

-- CreateIndex
CREATE INDEX "access_policies_domain_scope_idx" ON "access_policies"("domain_scope");

-- CreateIndex
CREATE INDEX "access_policies_context_scope_idx" ON "access_policies"("context_scope");

-- CreateIndex
CREATE INDEX "access_policies_data_contract_scope_idx" ON "access_policies"("data_contract_scope");

-- CreateIndex
CREATE INDEX "access_policies_domain_scope_context_scope_data_contract_scope_permission_id_idx" ON "access_policies"("domain_scope", "context_scope", "data_contract_scope", "permission_id");

