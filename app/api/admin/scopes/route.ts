export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { getDistinctScopes } from "@/src/lib/contracts";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const scopes = await getDistinctScopes();
  return NextResponse.json({ items: scopes });
}
