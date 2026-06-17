import { query } from "@/src/lib/db";

export type Permission = "read" | "write" | "admin";

export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  if (userPermissions.includes("admin")) return true;
  return userPermissions.includes(required);
}

export function canWrite(userPermissions: Permission[]): boolean {
  return hasPermission(userPermissions, "write");
}

export function canAdmin(userPermissions: Permission[]): boolean {
  return userPermissions.includes("admin");
}

export async function getAdminUserIds(): Promise<string[]> {
  const rows = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM access_policies
     WHERE permission_id = (SELECT id FROM permissions WHERE name = 'admin')
       AND user_id IS NOT NULL

     UNION

     SELECT DISTINCT ug.user_id
     FROM access_policies ap
     JOIN user_group ug ON ug.group_id = ap.group_id
     WHERE ap.permission_id = (SELECT id FROM permissions WHERE name = 'admin')`,
  );
  return rows.map((r) => r.user_id);
}

export async function getUserIdsWithScopeAccess(domain: string, context: string): Promise<string[]> {
  const rows = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM access_policies
     WHERE permission_id != (SELECT id FROM permissions WHERE name = 'admin')
       AND user_id IS NOT NULL
       AND (
         (domain_scope IS NULL AND context_scope IS NULL)
         OR (domain_scope = ? AND context_scope IS NULL)
         OR (domain_scope = ? AND context_scope = ?)
       )

     UNION

     SELECT DISTINCT ug.user_id
     FROM access_policies ap
     JOIN user_group ug ON ug.group_id = ap.group_id
     WHERE ap.permission_id != (SELECT id FROM permissions WHERE name = 'admin')
       AND (
         (ap.domain_scope IS NULL AND ap.context_scope IS NULL)
         OR (ap.domain_scope = ? AND ap.context_scope IS NULL)
         OR (ap.domain_scope = ? AND ap.context_scope = ?)
       )`,
    [domain, domain, context, domain, domain, context],
  );
  return rows.map((r) => r.user_id);
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const rows = await query<{ permission_name: string }>(
    `SELECT DISTINCT p.name AS permission_name
     FROM access_policies ap
     JOIN permissions p ON p.id = ap.permission_id
     WHERE (
       ap.user_id = ?
       OR ap.group_id IN (
         SELECT ug.group_id FROM user_group ug WHERE ug.user_id = ?
       )
     )
      AND ap.domain_scope IS NULL
      AND ap.context_scope IS NULL
      AND ap.data_contract_scope IS NULL`,
    [userId, userId],
  );

  const permissionMap: Record<string, Permission> = {
    admin: "admin",
    editor: "write",
    reader: "read",
  };

  const merged = new Set<Permission>();
  for (const row of rows) {
    const p = permissionMap[row.permission_name];
    if (p) merged.add(p);
  }

  return Array.from(merged);
}

type KcUser = { username: string };

async function searchKeycloakUsers(queryStr: string): Promise<string[]> {
  const issuer = (process.env.AUTH_KEYCLOAK_ISSUER ?? "").trim();
  if (!issuer) return [];

  const kcBase = issuer.replace(/\/realms\/.*$/, "");
  const realm = issuer.split("/").pop() ?? "data-contracts";
  const adminUser = process.env.KC_ADMIN ?? "admin";
  const adminPass = process.env.KC_ADMIN_PASSWORD ?? "admin";

  try {
    const tokenRes = await fetch(`${kcBase}/realms/master/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: adminUser,
        password: adminPass,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!tokenRes.ok) return [];

    const { access_token } = await tokenRes.json();
    const q = queryStr ? `?search=${encodeURIComponent(queryStr)}` : "?first=0&max=100";
    const userRes = await fetch(
      `${kcBase}/admin/realms/${realm}/users${q}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!userRes.ok) return [];

    const users: KcUser[] = await userRes.json();
    return users.map((u) => u.username).filter(Boolean);
  } catch {
    return [];
  }
}

export async function searchAllUsers(queryStr: string): Promise<string[]> {
  const local = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM (
      SELECT user_id FROM user_group
      UNION
      SELECT user_id FROM access_policies WHERE user_id IS NOT NULL
    )
     WHERE user_id LIKE ?
     ORDER BY user_id`,
    [`%${queryStr}%`],
  );
  const localUsers = local.map((r) => r.user_id);

  const keycloakUsers = await searchKeycloakUsers(queryStr);

  const seen = new Set(localUsers);
  for (const u of keycloakUsers) {
    if (!seen.has(u)) {
      localUsers.push(u);
      seen.add(u);
    }
  }

  return localUsers.sort();
}
