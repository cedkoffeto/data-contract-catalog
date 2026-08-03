export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { deleteGroup } from "@/src/lib/access-control";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  if (!session?.user?.email) {
    return apiError("Authentication required", 401);
  }
  const actorId = session.user.email;

  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return apiError("Invalid group id", 400);
  }

  try {
    await deleteGroup({ id: groupId, actorId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 400);
  }
}
