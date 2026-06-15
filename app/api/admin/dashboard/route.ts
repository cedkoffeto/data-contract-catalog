import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { query } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const [roleCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM roles");
  const userResults = await query<{ user_id: string }>("SELECT DISTINCT user_id FROM user_roles");
  const [assignCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM user_roles");
  const [auditCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM audit_log");

  const recentLogs = await query<{
    id: number;
    action: string;
    actor_id: string;
    target_type: string;
    target_id: string;
    created_at: string;
  }>("SELECT id, action, actor_id, target_type, target_id, created_at FROM audit_log ORDER BY id DESC");

  return NextResponse.json({
    roleCount: roleCountResult?.c ?? 0,
    userCount: userResults.length,
    assignCount: assignCountResult?.c ?? 0,
    auditCount: auditCountResult?.c ?? 0,
    recentLogs: recentLogs ?? [],
  });
}
