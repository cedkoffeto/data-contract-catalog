export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { getUserSubscriptions } from "@/src/lib/subscriptions";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET() {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
