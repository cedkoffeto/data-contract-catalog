import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { query } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const [groupCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM groups");
  const [memberCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM user_group");
  const [policyCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM access_policies");
  const [auditCountResult] = await query<{ c: number }>("SELECT COUNT(*) as c FROM audit_log");

  const recentLogs = await query<{
    id: number;
    action: string;
    actor_id: string;
    target_type: string;
    target_id: string;
    details: string;
    created_at: string;
  }>("SELECT id, action, actor_id, target_type, target_id, details, created_at FROM audit_log ORDER BY id DESC");

  return NextResponse.json({
    groupCount: groupCountResult?.c ?? 0,
    memberCount: memberCountResult?.c ?? 0,
    policyCount: policyCountResult?.c ?? 0,
    auditCount: auditCountResult?.c ?? 0,
    recentLogs: recentLogs ?? [],
  });
}
