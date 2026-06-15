import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { deleteRole, getRole, updateRole } from "@/src/lib/rbac";
import { auth } from "@/src/auth";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { name } = await params;
  const role = await getRole(name);

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  return NextResponse.json(role);
}

export async function PUT(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { name } = await params;

  try {
    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "permissions (string[]) is required" }, { status: 400 });
    }

    const role = await updateRole({
      name,
      permissions,
      actorId: session!.user!.email!,
    });

    return NextResponse.json(role);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update role";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { name } = await params;

  try {
    await deleteRole({ name, actorId: session!.user!.email! });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete role";
    const status = message.includes("still assigned") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
