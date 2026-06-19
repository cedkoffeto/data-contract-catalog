export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { listAllGroupMemberships } from "@/src/lib/access-control";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const items = await listAllGroupMemberships();
  return NextResponse.json({ items });
}
