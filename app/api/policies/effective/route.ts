export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { getEffectivePoliciesForUser } from "@/src/lib/access-control";

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.name;

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId") ?? userId;

  // Users can only view their own policies unless they're admins
  const userPerms = (session.user as Record<string, unknown>).permissions as string[] | undefined;
  if (targetUserId !== userId && !userPerms?.includes("admin")) {
    return NextResponse.json({ error: "Can only view own policies" }, { status: 403 });
  }

  const items = await getEffectivePoliciesForUser(targetUserId);
  return NextResponse.json({ items });
}