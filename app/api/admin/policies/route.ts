import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { listAccessPolicies, createAccessPolicy, listPermissions } from "@/src/lib/access-control";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const items = await listAccessPolicies();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();

  try {
    const body = await request.json();
    const { userId, groupId, permissionId, domainScope, contextScope } = body;

    if (!userId && !groupId) {
      return NextResponse.json({ error: "Either userId or groupId is required" }, { status: 400 });
    }
    if (userId && groupId) {
      return NextResponse.json({ error: "Provide either userId or groupId, not both" }, { status: 400 });
    }
    if (!permissionId) {
      return NextResponse.json({ error: "permissionId (number) is required" }, { status: 400 });
    }

    const policy = await createAccessPolicy({
      userId: userId ?? null,
      groupId: groupId ?? null,
      permissionId,
      domainScope: domainScope ?? null,
      contextScope: contextScope ?? null,
      actorId: session!.user!.email!,
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
