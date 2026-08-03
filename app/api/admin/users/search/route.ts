export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/lib/require-admin";
import { searchAllUsers } from "@/src/lib/rbac";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const users = await searchAllUsers(q);
  return NextResponse.json({ items: users });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
