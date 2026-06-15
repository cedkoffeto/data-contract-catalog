import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { assignUserRole, listUserRoles, revokeUserRole } from "@/src/lib/rbac";
import { auth } from "@/src/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const assignments = await listUserRoles(id);

  return NextResponse.json({ items: assignments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;

  try {
    const body = await request.json();
    const { roleName } = body;

    if (!roleName) {
      return NextResponse.json({ error: "roleName is required" }, { status: 400 });
    }

    await assignUserRole({
      userId: id,
      roleName,
      assignedBy: session!.user!.email!,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign role";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;

  try {
    const body = await request.json();
    const { roleName } = body;

    if (!roleName) {
      return NextResponse.json({ error: "roleName is required" }, { status: 400 });
    }

    await revokeUserRole({
      userId: id,
      roleName,
      revokedBy: session!.user!.email!,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke role";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
