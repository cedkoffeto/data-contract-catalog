import { execute, query } from "@/src/lib/db";

export type AuditAction =
  | "subscription.subscribe"
  | "subscription.unsubscribe"
  | "contract.create"
  | "contract.update"
  | "policy.create"
  | "policy.update"
  | "policy.delete"
  | "group.create"
  | "group.delete"
  | "group.add_member"
  | "group.remove_member"
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.unauthorized"
  | "access_request.create"
  | "access_request.approve"
  | "access_request.deny";

export type AuditTargetType = "user" | "contract" | "policy" | "group" | "system";

export async function writeAuditLog(params: {
  action: AuditAction;
  actorId: string;
  targetType: AuditTargetType;
  targetId: string;
  details?: Record<string, unknown>;
  sessionId?: string;
}) {
  await execute(
    `INSERT INTO audit_log (action, actor_id, target_type, target_id, details, session_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.action,
      params.actorId,
      params.targetType,
      params.targetId,
      JSON.stringify(params.details ?? {}),
      params.sessionId ?? "",
    ]
  );
}

export async function cleanupAuditLogs(retentionDays = 90) {
  const result = await execute(
    "DELETE FROM audit_log WHERE created_at < NOW() - (?::INTEGER * INTERVAL '1 day')",
    [retentionDays]
  );
  return result.changes;
}

export async function countAuditLogs(search?: string) {
  const where = search
    ? "WHERE action LIKE ? OR actor_id LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR details LIKE ?"
    : "";
  const params = search ? Array(5).fill(`%${search}%`) : [];
  const [row] = await query<{ c: number }>(`SELECT COUNT(*) as c FROM audit_log ${where}`, params);
  return Number(row?.c ?? 0);
}

export async function listAuditLogs(params: {
  page: number;
  pageSize: number;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}) {
  const { page, pageSize, sortKey = "created_at", sortDir = "desc", search } = params;
  const allowedSorts = new Set(["created_at", "action", "actor_id", "target_type", "target_id", "details"]);
  const key = allowedSorts.has(sortKey) ? sortKey : "created_at";
  const dir = sortDir === "asc" ? "ASC" : "DESC";

  let where = "";
  let queryParams: unknown[] = [];
  if (search) {
    where = "WHERE action LIKE ? OR actor_id LIKE ? OR target_type LIKE ? OR target_id LIKE ? OR details LIKE ?";
    queryParams = Array(5).fill(`%${search}%`);
  }

  const offset = page * pageSize;
  const rows = await query<AuditLogRow>(
    `SELECT id, action, actor_id, target_type, target_id, details, created_at FROM audit_log ${where} ORDER BY ${key} ${dir} LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );
  return rows.map((r) => ({
    ...r,
    id: Number(r.id),
  }));
}

type AuditLogRow = {
  id: number;
  action: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
};
