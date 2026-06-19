export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { getEffectivePoliciesForUser } from "@/src/lib/access-control";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
  }

  const items = await getEffectivePoliciesForUser(userId);
  return NextResponse.json({ items, userId });
}
