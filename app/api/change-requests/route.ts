import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { listChangeRequests } from "@/src/lib/change-requests";
import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPermissions } from "@/src/lib/rbac";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getUserPermissions(userId);
  const all = await listChangeRequests();

  const items = permissions.includes("admin")
    ? all
    : all.filter((cr) => cr.editorId === userId);

  return NextResponse.json({ items });
}
