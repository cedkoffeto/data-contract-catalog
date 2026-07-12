import { prisma } from "@/src/lib/prisma";
import { requireAdmin } from "@/src/lib/require-admin";
import { getContracts } from "@/src/lib/contracts";
import { auth } from "@/src/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name ?? "";

  const [
    groupCount,
    memberCount,
    policyCount,
    userCount,
    notificationsCount,
    unreadNotificationsCount,
    subscriptionsCount,
    auditCount,
  ] = await Promise.all([
    prisma.group.count(),
    prisma.userGroup.count(),
    prisma.accessPolicy.count(),
    prisma.userGroup.findMany({ select: { userId: true }, distinct: ["userId"] }).then((r) => r.length),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.subscription.count(),
    prisma.auditLog.count(),
  ]);

  const contracts = await getContracts();
  const contractsCount = contracts.length;

  return Response.json({
    contractsCount,
    groupCount,
    memberCount,
    userCount,
    policyCount,
    notificationsCount,
    unreadNotificationsCount,
    subscriptionsCount,
    auditCount,
  });
}
