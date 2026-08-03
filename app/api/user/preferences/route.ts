export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPreference, setUserPreference } from "@/src/lib/subscriptions";
import type { NotificationChannel } from "@/src/lib/subscriptions";

export async function GET() {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return apiError("Authentication required", 401);
    }

    const pref = await getUserPreference(userId);
    return NextResponse.json({
      preference: pref ?? { user_id: userId, notification_channel: "in_app" },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return apiError("Authentication required", 401);
    }

    const body = (await req.json()) as { notificationChannel?: string } | null;
    const channel = body?.notificationChannel;

    if (!channel || !["in_app", "email", "both"].includes(channel)) {
      return apiError("Invalid notification channel", 400);
    }

    await setUserPreference(userId, channel as NotificationChannel);
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
