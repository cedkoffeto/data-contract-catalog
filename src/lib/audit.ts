import { execute } from "@/src/lib/db";

export type AuditAction =
  | "role.create"
  | "role.update"
  | "role.delete"
  | "user.assign"
  | "user.revoke"
  | "subscription.subscribe"
  | "subscription.unsubscribe"
  | "contract.create"
  | "contract.update";

export type AuditTargetType = "role" | "user" | "contract";

export async function writeAuditLog(params: {
  action: AuditAction;
  actorId: string;
  targetType: AuditTargetType;
  targetId: string;
  details?: Record<string, unknown>;
}) {
  await execute(
    `INSERT INTO audit_log (action, actor_id, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)`,
    [
      params.action,
      params.actorId,
      params.targetType,
      params.targetId,
      JSON.stringify(params.details ?? {}),
    ]
  );
}
