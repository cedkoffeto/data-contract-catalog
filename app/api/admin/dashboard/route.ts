import { requireAdmin } from "@/src/lib/require-admin";
import { query } from "@/src/lib/db";
import { getContracts } from "@/src/lib/contracts";
import { auth } from "@/src/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name ?? "";

  const [groupCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM groups");
  const [memberCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM user_group");
  const [policyCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM access_policies");
  const [userCountResult] = await query<{ c: number }>("SELECT COUNT(DISTINCT user_id) as c FROM user_group");
  const [notifCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM notifications WHERE user_id = ?", [userId]);
  const [unreadResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0", [userId]);
  const [subCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM subscriptions");
  const [auditCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM audit_log");

  const contracts = await getContracts();
  const contractsCount = contracts.length;

  return Response.json({
    contractsCount,
    groupCount: Number(groupCountResult?.c ?? 0),
    memberCount: Number(memberCountResult?.c ?? 0),
    userCount: Number(userCountResult?.c ?? 0),
    policyCount: Number(policyCountResult?.c ?? 0),
    notificationsCount: Number(notifCountResult?.c ?? 0),
    unreadNotificationsCount: Number(unreadResult?.c ?? 0),
    subscriptionsCount: Number(subCountResult?.c ?? 0),
    auditCount: Number(auditCountResult?.c ?? 0),
  });
}
