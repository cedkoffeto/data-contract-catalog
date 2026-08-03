export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { listAllGroupMemberships } from "@/src/lib/access-control";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const items = await listAllGroupMemberships();
  return NextResponse.json({ items });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
