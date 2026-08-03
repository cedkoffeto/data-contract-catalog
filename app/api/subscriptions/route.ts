export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { getUserSubscriptions } from "@/src/lib/subscriptions";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET() {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return apiError("Authentication required", 401);
    }

    const subscriptions = await getUserSubscriptions(userId);

    return NextResponse.json({
      subscriptions: subscriptions.map((s) => ({
        userId: s.user_id,
        contractSlug: s.contract_slug,
        channel: s.channel,
        createdAt: s.created_at,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
