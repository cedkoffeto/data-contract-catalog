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

  const extra = session.user as Record<string, unknown>;
  const globalPermissions = (extra.permissions as string[]) ?? await getUserPermissions(session.user.name ?? session.user.email);

  if (!globalPermissions.includes("admin")) {
    writeAuditLog({
      action: "auth.unauthorized",
      actorId: session.user.name ?? "unknown",
      targetType: "system",
      targetId: "admin-api",
      details: { reason: "not_admin", permissions: globalPermissions, path: "unknown" },
    }).catch(() => {});
    return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
  }

  return null;
}
