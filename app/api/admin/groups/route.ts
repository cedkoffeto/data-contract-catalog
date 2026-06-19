export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { listGroups, createGroup } from "@/src/lib/access-control";
import { extractSessionId } from "@/src/lib/audit-session";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const items = await listGroups();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();

  try {
    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "name (string) is required" }, { status: 400 });
    }
    const sessionId = extractSessionId(request);
    const group = await createGroup({ name: name.trim(), actorId: session!.user!.email!, sessionId });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create group";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
