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
  | "group.remove_member";

export type AuditTargetType = "user" | "contract" | "policy" | "group";

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
