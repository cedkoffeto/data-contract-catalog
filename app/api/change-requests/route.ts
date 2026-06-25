export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { listChangeRequests } from "@/src/lib/change-requests";
import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPermissions } from "@/src/lib/rbac";

export async function GET() {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
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
