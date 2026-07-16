export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { auth } from "@/src/auth";
import { getEffectivePoliciesForUser } from "@/src/lib/access-control";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.name;

  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId") ?? userId;

  // Users can only view their own policies unless they're admins
  const userPerms = (session.user as Record<string, unknown>).permissions as string[] | undefined;
  if (targetUserId !== userId && !userPerms?.includes("admin")) {
    return apiError("Can only view own policies", 403);
  }

  const items = await getEffectivePoliciesForUser(targetUserId);
  return NextResponse.json({ items });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };