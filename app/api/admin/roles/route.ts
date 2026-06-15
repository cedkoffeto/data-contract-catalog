import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { createRole, listRoles } from "@/src/lib/rbac";
import { auth } from "@/src/auth";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const roles = await listRoles();
  return NextResponse.json({ items: roles });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();

  try {
    const body = await request.json();
    const { name, permissions } = body;

    if (!name || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "name (string) and permissions (string[]) are required" }, { status: 400 });
    }

    const role = await createRole({
      name,
      permissions,
      actorId: session!.user!.email!,
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create role";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
