export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { markAsUnread } from "@/src/lib/notifications";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function POST(req: Request) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await req.json()) as { ids?: number[] } | null;
    const ids = body?.ids;
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }

    await markAsUnread(ids, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
