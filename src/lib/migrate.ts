import { migrate, query } from "@/src/lib/db";

export type PermissionLevel = "admin" | "editor" | "reader";

async function seedDefaultPermissions() {
  const existing = await query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM permissions",
  );
  if ((existing[0]?.c ?? 0) > 0) return;

  await migrate("INSERT INTO permissions (name) VALUES ('admin') ON CONFLICT DO NOTHING");
  await migrate("INSERT INTO permissions (name) VALUES ('editor') ON CONFLICT DO NOTHING");
  await migrate("INSERT INTO permissions (name) VALUES ('reader') ON CONFLICT DO NOTHING");
  console.info("[migrate] Seeded default permissions (admin, editor, reader)");
}

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
      `INSERT INTO access_policies (user_id, group_id, permission_id, domain_scope, context_scope)
       VALUES (?, NULL, ?, NULL, NULL) ON CONFLICT DO NOTHING`,
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
      `INSERT INTO access_policies (user_id, group_id, permission_id, domain_scope, context_scope)
       VALUES (?, NULL, ?, NULL, NULL) ON CONFLICT DO NOTHING`,
      [userId, permRow[0].id],
    );
    count++;
  }

  if (count > 0) {
    console.info(`[migrate] Seeded ${count} default access polic${count > 1 ? "ies" : "y"}`);
  }
}

export async function runMigrations(): Promise<void> {
  try {
    await migrate(
      `CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    );

    await seedDefaultPermissions();
    await migrateRolesToAccessPolicies();
    await seedDefaultPolicies();
  } catch (error) {
    console.error("[migrate] Migration failed:", error);
  }
}
