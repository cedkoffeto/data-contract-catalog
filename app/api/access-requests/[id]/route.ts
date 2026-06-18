import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { execute } from "@/src/lib/db";
import { getAdminUserIds } from "@/src/lib/rbac";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const adminIds = await getAdminUserIds();
  if (!adminIds.includes(userId)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!["pending", "approved", "denied"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await execute(
    "UPDATE access_requests SET status = ? WHERE id = ?",
    [status, parseInt(id, 10)],
  );

  return NextResponse.json({ success: true });
}
