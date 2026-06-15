import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { getUserPermissions } from "@/src/lib/rbac";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getUserPermissions(session.user.name ?? session.user.email);

  if (!permissions.includes("admin")) {
    return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
  }

  return null;
}
