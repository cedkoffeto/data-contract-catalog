import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { listAllAssignments } from "@/src/lib/rbac";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const rows = await listAllAssignments();
  const items = rows.map((r) => ({
    userId: r.user_id,
    roleName: r.role_name,
    assignedBy: r.assigned_by,
    assignedAt: r.assigned_at,
    role: { name: r.name, permissions: r.permissions },
  }));
  return NextResponse.json({ items });
}
