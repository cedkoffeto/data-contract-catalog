export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { listGroups, createGroup } from "@/src/lib/access-control";
import { extractSessionId } from "@/src/lib/audit-session";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const items = await listGroups();
  return NextResponse.json({ items });
}

async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();

  const body = await request.json();
  const { name } = body;
  if (!name?.trim()) {
    return apiError("name (string) is required", 400);
  }
  const sessionId = extractSessionId(request);
  const group = await createGroup({ name: name.trim(), actorId: session!.user!.email!, sessionId });
  return NextResponse.json(group, { status: 201 });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
