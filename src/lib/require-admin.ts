import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { getUserPermissions } from "@/src/lib/rbac";
import { writeAuditLog } from "@/src/lib/audit";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.email) {
    const userId = session?.user?.name ?? "unknown";
    writeAuditLog({
      action: "auth.unauthorized",
      actorId: userId,
      targetType: "system",
      targetId: "admin-api",
      details: { reason: "no_session", path: "unknown" },
    }).catch(() => {});
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getUserPermissions(session.user.name ?? session.user.email);

  if (!permissions.includes("admin")) {
    writeAuditLog({
      action: "auth.unauthorized",
      actorId: session.user.name ?? "unknown",
      targetType: "system",
      targetId: "admin-api",
      details: { reason: "not_admin", permissions, path: "unknown" },
    }).catch(() => {});
    return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
  }

  return null;
}
