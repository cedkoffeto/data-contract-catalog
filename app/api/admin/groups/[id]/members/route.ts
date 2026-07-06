export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { addUserToGroup, listGroupMembers, removeUserFromGroup } from "@/src/lib/access-control";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  const members = await listGroupMembers(groupId);
  return NextResponse.json({ members });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId?.trim()) {
      return NextResponse.json({ error: "userId (string) is required" }, { status: 400 });
    }
    await addUserToGroup({ userId: userId.trim(), groupId, actorId: session!.user!.email! });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId?.trim()) {
      return NextResponse.json({ error: "userId (string) is required" }, { status: 400 });
    }
    await removeUserFromGroup({ userId: userId.trim(), groupId, actorId: session!.user!.email! });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, 400);
  }
}
