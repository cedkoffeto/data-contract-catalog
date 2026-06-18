import { migrate, query } from "@/src/lib/db";

export type PermissionLevel = "admin" | "editor" | "reader";

async function migrateRolesToAccessPolicies() {
  const existing = await query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM access_policies WHERE user_id IS NOT NULL",
  );
  if ((existing[0]?.c ?? 0) > 0) return;

  const hasOldTables = await query<{ c: number }>(
    `SELECT COUNT(*) AS c FROM sqlite_master
     WHERE type='table' AND name IN ('user_roles', 'roles')`,
  );
  if ((hasOldTables[0]?.c ?? 0) < 2) return;

  const rows = await query<{ user_id: string; permissions: string }>(
    `SELECT DISTINCT u.user_id, r.permissions
     FROM user_roles u
     JOIN roles r ON r.name = u.role_name`,
  );

  for (const row of rows) {
    let perms: string[];
    try { perms = JSON.parse(row.permissions); } catch { perms = []; }

    const level: PermissionLevel | null = perms.includes("admin")
      ? "admin"
      : perms.includes("write")
        ? "editor"
        : perms.includes("read")
          ? "reader"
          : null;

    if (!level) continue;

    const permRow = await query<{ id: number }>(
      "SELECT id FROM permissions WHERE name = ?",
      [level],
    );
    if (permRow.length === 0) continue;

    await migrate(
      `INSERT OR IGNORE INTO access_policies (user_id, group_id, permission_id, domain_scope, context_scope)
       VALUES (?, NULL, ?, NULL, NULL)`,
      [row.user_id, permRow[0].id],
    );
  }

  if (rows.length > 0) {
    console.info(`[migrate] Migrated ${rows.length} role assignment(s) to access_policies`);
  }
}

const DEFAULT_POLICIES: Array<{ userId: string; permission: PermissionLevel }> = [
  { userId: "admin.user", permission: "admin" },
  { userId: "contract.user", permission: "reader" },
  { userId: "editor.user", permission: "editor" },
  { userId: "reader.user", permission: "reader" },
  { userId: "data_owner.user", permission: "reader" },
  ...[1, 2, 3, 4, 5].map((i) => ({ userId: `de${i}`, permission: "reader" as PermissionLevel })),
];

async function seedDefaultPolicies() {
  const existing = await query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM access_policies WHERE user_id IS NOT NULL",
  );
  if ((existing[0]?.c ?? 0) > 0) return;

  let count = 0;
  for (const { userId, permission } of DEFAULT_POLICIES) {
    const permRow = await query<{ id: number }>(
      "SELECT id FROM permissions WHERE name = ?",
      [permission],
    );
    if (permRow.length === 0) continue;

    await migrate(
      `INSERT OR IGNORE INTO access_policies (user_id, group_id, permission_id, domain_scope, context_scope)
       VALUES (?, NULL, ?, NULL, NULL)`,
      [userId, permRow[0].id],
    );
    count++;
  }

  if (count > 0) {
    console.info(`[migrate] Seeded ${count} default access polic${count > 1 ? "ies" : "y"}`);
  }
}

const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: "001_full_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      INSERT OR IGNORE INTO permissions (name) VALUES ('admin');
      INSERT OR IGNORE INTO permissions (name) VALUES ('editor');
      INSERT OR IGNORE INTO permissions (name) VALUES ('reader');

      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS user_group (
        user_id TEXT NOT NULL,
        group_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, group_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS access_policies (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        group_id INTEGER,
        permission_id INTEGER NOT NULL,
        domain_scope TEXT,
        context_scope TEXT,
        data_contract_scope TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_access_policies_user_scope
        ON access_policies(user_id, COALESCE(domain_scope,''), COALESCE(context_scope,''), COALESCE(data_contract_scope,''))
        WHERE user_id IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_access_policies_group_scope
        ON access_policies(group_id, COALESCE(domain_scope,''), COALESCE(context_scope,''), COALESCE(data_contract_scope,''))
        WHERE group_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_user_group_user_id ON user_group(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_group_group_id ON user_group(group_id);
      CREATE INDEX IF NOT EXISTS idx_access_policies_user_id ON access_policies(user_id);
      CREATE INDEX IF NOT EXISTS idx_access_policies_group_id ON access_policies(group_id);
      CREATE INDEX IF NOT EXISTS idx_access_policies_permission_id ON access_policies(permission_id);
      CREATE INDEX IF NOT EXISTS idx_access_policies_domain_scope ON access_policies(domain_scope);
      CREATE INDEX IF NOT EXISTS idx_access_policies_context_scope ON access_policies(context_scope);
      CREATE INDEX IF NOT EXISTS idx_access_policies_data_contract_scope ON access_policies(data_contract_scope);

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

      CREATE TABLE IF NOT EXISTS subscriptions (
        user_id TEXT NOT NULL,
        contract_slug TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'in_app',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, contract_slug)
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_contract_slug ON subscriptions(contract_slug);

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        contract_slug TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        title TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    `,
  },
  {
    id: "002_user_preferences",
    sql: `
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT NOT NULL PRIMARY KEY,
        notification_channel TEXT NOT NULL DEFAULT 'in_app',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
  {
    id: "003_access_requests",
    sql: `
      CREATE TABLE IF NOT EXISTS access_requests (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        domain TEXT NOT NULL DEFAULT '',
        context TEXT NOT NULL DEFAULT '',
        data_contract TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
      CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  try {
    await migrate(
      `CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    );

    for (const migration of MIGRATIONS) {
      const rows = await query<{ c: number }>(
        "SELECT COUNT(*) AS c FROM _migrations WHERE id = ?",
        [migration.id],
      );
      const alreadyApplied = (rows[0]?.c ?? 0) > 0;
      if (alreadyApplied) continue;

      await migrate(migration.sql);

      await migrate("INSERT INTO _migrations (id) VALUES (?)", [migration.id]);
      console.info("[migrate] Applied migration:", migration.id);
    }

    await migrateRolesToAccessPolicies();
    await seedDefaultPolicies();
  } catch (error) {
    console.error("[migrate] Migration failed:", error);
  }
}
