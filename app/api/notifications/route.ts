import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { getUserNotifications } from "@/src/lib/notifications";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET() {
  try {
    const unauthorized = await requireApiAuth();
    if (unauthorized) return unauthorized;

    const session = await auth();
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
        isRead: n.is_read === 1,
        createdAt: n.created_at,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
