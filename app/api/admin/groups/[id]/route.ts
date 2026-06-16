import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { deleteGroup } from "@/src/lib/access-control";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  try {
    await deleteGroup({ id: groupId, actorId: session!.user!.email! });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete group";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
