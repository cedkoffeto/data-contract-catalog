import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import { deleteAccessPolicy, updateAccessPolicy } from "@/src/lib/access-control";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const policyId = parseInt(id, 10);

  if (isNaN(policyId)) {
    return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { permissionId, domainScope, contextScope } = body;

    if (!permissionId) {
      return NextResponse.json({ error: "permissionId is required" }, { status: 400 });
    }

    const policy = await updateAccessPolicy({
      id: policyId,
      permissionId,
      domainScope: domainScope ?? null,
      contextScope: contextScope ?? null,
      actorId: session!.user!.email!,
    });

    return NextResponse.json(policy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const policyId = parseInt(id, 10);

  if (isNaN(policyId)) {
    return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
  }

  try {
    await deleteAccessPolicy({ id: policyId, actorId: session!.user!.email! });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
