export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { addUserToGroup, listGroupMembers, removeUserFromGroup } from "@/src/lib/access-control";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return apiError("Invalid group id", 400);
  }

  const members = await listGroupMembers(groupId);
  return NextResponse.json({ members });
}

async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return apiError("Invalid group id", 400);
  }

  const body = await request.json();
  const { userId } = body;
  if (!userId?.trim()) {
    return apiError("userId (string) is required", 400);
  }
  await addUserToGroup({ userId: userId.trim(), groupId, actorId: session!.user!.email! });
  return NextResponse.json({ success: true }, { status: 201 });
}

async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return apiError("Invalid group id", 400);
  }

  const body = await request.json();
  const { userId } = body;
  if (!userId?.trim()) {
    return apiError("userId (string) is required", 400);
  }
  await removeUserFromGroup({ userId: userId.trim(), groupId, actorId: session!.user!.email! });
  return NextResponse.json({ success: true });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
export const DELETE_handler = withErrorHandling(DELETE);
export { DELETE_handler as DELETE };
