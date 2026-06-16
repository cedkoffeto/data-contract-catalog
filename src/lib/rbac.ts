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
     AND ap.context_scope IS NULL`,
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

export async function searchAllUsers(queryStr: string): Promise<string[]> {
  const rows = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM (
      SELECT user_id FROM user_group
      UNION
      SELECT user_id FROM access_policies WHERE user_id IS NOT NULL
    )
     WHERE user_id LIKE ?
     ORDER BY user_id`,
    [`%${queryStr}%`],
  );
  return rows.map((r) => r.user_id);
}
