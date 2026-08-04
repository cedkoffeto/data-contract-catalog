export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { getDistinctScopes } from "@/src/lib/contracts";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const scopes = await getDistinctScopes();
  return NextResponse.json({ items: scopes });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
