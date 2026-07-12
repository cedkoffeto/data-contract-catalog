import { prisma } from "@/src/lib/prisma";

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

const SORT_MAP: Record<string, string> = {
  created_at: "createdAt",
  action: "action",
  actor_id: "actorId",
  target_type: "targetType",
  target_id: "targetId",
  details: "details",
};

export async function writeAuditLog(params: {
  action: AuditAction;
  actorId: string;
  targetType: AuditTargetType;
  targetId: string;
  details?: Record<string, unknown>;
  sessionId?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      actorId: params.actorId,
      targetType: params.targetType,
      targetId: params.targetId,
      details: JSON.stringify(params.details ?? {}),
      sessionId: params.sessionId ?? "",
    },
  });
}

export async function cleanupAuditLogs(retentionDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

async function getAuditSearchFilter(search?: string) {
  if (!search) return {};
  return {
    OR: [
      { action: { contains: search, mode: "insensitive" as const } },
      { actorId: { contains: search, mode: "insensitive" as const } },
      { targetType: { contains: search, mode: "insensitive" as const } },
      { targetId: { contains: search, mode: "insensitive" as const } },
      { details: { contains: search, mode: "insensitive" as const } },
    ],
  };
}

export async function countAuditLogs(search?: string) {
  return prisma.auditLog.count({
    where: await getAuditSearchFilter(search),
  });
}

export async function listAuditLogs(params: {
  page: number;
  pageSize: number;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}) {
  const { page, pageSize, sortKey = "created_at", sortDir = "desc", search } = params;
  const prismaKey = SORT_MAP[sortKey] ?? "createdAt";
  const dir = sortDir === "asc" ? "asc" : "desc";

  const rows = await prisma.auditLog.findMany({
    where: await getAuditSearchFilter(search),
    orderBy: { [prismaKey]: dir },
    skip: page * pageSize,
    take: pageSize,
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    actor_id: r.actorId,
    target_type: r.targetType,
    target_id: r.targetId,
    details: r.details,
    created_at: r.createdAt.toISOString(),
  }));
}
