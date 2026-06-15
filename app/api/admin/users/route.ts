import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { searchUsers } from "@/src/lib/rbac";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const users = await searchUsers(q);
  return NextResponse.json({ items: users });
}
