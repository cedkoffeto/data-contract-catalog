import { execute } from "@/src/lib/db";

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
