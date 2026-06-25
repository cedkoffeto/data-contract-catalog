export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { getUserNotifications } from "@/src/lib/notifications";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET() {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const notifications = await getUserNotifications(userId);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        contractSlug: n.contract_slug,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata,
        isRead: n.is_read === 1,
        createdAt: n.created_at,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
