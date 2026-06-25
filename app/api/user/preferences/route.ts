export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPreference, setUserPreference } from "@/src/lib/subscriptions";
import type { NotificationChannel } from "@/src/lib/subscriptions";

export async function GET() {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const pref = await getUserPreference(userId);
    return NextResponse.json({
      preference: pref ?? { user_id: userId, notification_channel: "in_app" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await req.json()) as { notificationChannel?: string } | null;
    const channel = body?.notificationChannel;

    if (!channel || !["in_app", "email", "both"].includes(channel)) {
      return NextResponse.json({ error: "Invalid notification channel" }, { status: 400 });
    }

    await setUserPreference(userId, channel as NotificationChannel);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
