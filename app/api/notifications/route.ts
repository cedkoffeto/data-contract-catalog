export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { getUserNotifications } from "@/src/lib/notifications";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET(request: Request) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return apiError("Authentication required", 401);
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 20), 100);
    const notifications = await getUserNotifications(userId, limit);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: Number(n.id),
        contractSlug: n.contract_slug,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata,
        isRead: Number(n.is_read) === 1,
        createdAt: n.created_at,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
