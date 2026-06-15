import { execute, get, query } from "@/src/lib/db";
import { writeAuditLog } from "@/src/lib/audit";

export type Permission = "read" | "write" | "admin";

export function parsePermissions(raw: string): Permission[] {
  try {
    return JSON.parse(raw) as Permission[];
  } catch {
    return [];
  }
}

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

export async function getUserRoles(userId: string): Promise<string[]> {
  const rows = await query<{ role_name: string }>(
    "SELECT role_name FROM user_roles WHERE user_id = ?",
    [userId]
  );
  return rows.map((r) => r.role_name);
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const rows = await query<{ permissions: string }>(
    `SELECT r.permissions FROM user_roles u
     JOIN roles r ON r.name = u.role_name
     WHERE u.user_id = ?`,
    [userId]
  );

  const merged = new Set<Permission>();
  for (const row of rows) {
    for (const p of parsePermissions(row.permissions)) {
      merged.add(p);
    }
  }

  return Array.from(merged);
}

export async function getRole(roleName: string) {
  return get<{ name: string; permissions: string; created_at: string; updated_at: string }>(
    "SELECT * FROM roles WHERE name = ?",
    [roleName]
  );
}

export async function listRoles() {
  return query<{ name: string; permissions: string; created_at: string; updated_at: string }>(
    "SELECT * FROM roles ORDER BY name ASC"
  );
}

export async function createRole(params: {
  name: string;
  permissions: Permission[];
  actorId: string;
}) {
  await execute(
    "INSERT INTO roles (name, permissions, updated_at) VALUES (?, ?, datetime('now'))",
    [params.name, JSON.stringify(params.permissions)]
  );

  await writeAuditLog({
    action: "role.create",
    actorId: params.actorId,
    targetType: "role",
    targetId: params.name,
    details: { permissions: params.permissions },
  });

  return getRole(params.name);
}

export async function updateRole(params: {
  name: string;
  permissions: Permission[];
  actorId: string;
}) {
  const previous = await getRole(params.name);

  await execute(
    "UPDATE roles SET permissions = ? WHERE name = ?",
    [JSON.stringify(params.permissions), params.name]
  );

  await writeAuditLog({
    action: "role.update",
    actorId: params.actorId,
    targetType: "role",
    targetId: params.name,
    details: {
      previous: previous ? parsePermissions(previous.permissions) : [],
      new: params.permissions,
    },
  });

  return getRole(params.name);
}

export async function deleteRole(params: { name: string; actorId: string }) {
  const assignments = await query<{ c: number }>(
    "SELECT COUNT(*) as c FROM user_roles WHERE role_name = ?",
    [params.name]
  );

  if ((assignments[0]?.c ?? 0) > 0) {
    throw new Error(
      `Cannot delete role "${params.name}": ${assignments[0].c} user(s) are still assigned to it.`
    );
  }

  await execute("DELETE FROM roles WHERE name = ?", [params.name]);

  await writeAuditLog({
    action: "role.delete",
    actorId: params.actorId,
    targetType: "role",
    targetId: params.name,
  });
}

export async function assignUserRole(params: {
  userId: string;
  roleName: string;
  assignedBy: string;
}) {
  const role = await getRole(params.roleName);
  if (!role) {
    throw new Error(`Role "${params.roleName}" does not exist.`);
  }

  await execute(
    `INSERT OR IGNORE INTO user_roles (user_id, role_name, assigned_by) VALUES (?, ?, ?)`,
    [params.userId, params.roleName, params.assignedBy]
  );

  await writeAuditLog({
    action: "user.assign",
    actorId: params.assignedBy,
    targetType: "user",
    targetId: params.userId,
    details: { role: params.roleName },
  });
}

export async function revokeUserRole(params: {
  userId: string;
  roleName: string;
  revokedBy: string;
}) {
  await execute(
    "DELETE FROM user_roles WHERE user_id = ? AND role_name = ?",
    [params.userId, params.roleName]
  );

  await writeAuditLog({
    action: "user.revoke",
    actorId: params.revokedBy,
    targetType: "user",
    targetId: params.userId,
    details: { role: params.roleName },
  });
}

export async function listUserRoles(userId: string) {
  return query<{
    user_id: string;
    role_name: string;
    assigned_by: string;
    assigned_at: string;
    name: string;
    permissions: string;
  }>(
    `SELECT u.*, r.name, r.permissions FROM user_roles u
     JOIN roles r ON r.name = u.role_name
     WHERE u.user_id = ?`,
    [userId]
  );
}

export async function listAllAssignments() {
  return query<{
    user_id: string;
    role_name: string;
    assigned_by: string;
    assigned_at: string;
    name: string;
    permissions: string;
  }>(
    `SELECT u.*, r.name, r.permissions FROM user_roles u
     JOIN roles r ON r.name = u.role_name
     ORDER BY u.user_id ASC, u.role_name ASC`
  );
}

export async function searchUsers(queryStr: string): Promise<string[]> {
  const rows = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM user_roles WHERE user_id LIKE ? LIMIT 20`,
    [`%${queryStr}%`]
  );
  return rows.map((r) => r.user_id);
}
