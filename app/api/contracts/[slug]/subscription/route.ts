export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { requireApiAuth } from "@/src/lib/require-auth";
import { getSubscription, subscribe, unsubscribe } from "@/src/lib/subscriptions";
import { extractSessionId } from "@/src/lib/audit-session";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;

    const { slug } = await params;
    const userId = session?.user?.name;
    if (!userId) {
      return apiError("Authentication required", 401);
    }

    const subscription = await getSubscription(userId, slug);
    return NextResponse.json({ subscription });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;

    const { slug } = await params;
    const userId = session?.user?.name;
    if (!userId) {
      return apiError("Authentication required", 401);
    }

    const body = (await req.json()) as { channel?: string | null } | null;
    const channel = body?.channel;
    const sessionId = extractSessionId(req);

    if (channel === null) {
      await unsubscribe({ userId, contractSlug: slug, actorId: userId, sessionId });
      return NextResponse.json({ subscription: null });
    }

    const subscription = await subscribe({ userId, contractSlug: slug, actorId: userId, sessionId });
    return NextResponse.json({ subscription });
  } catch (e) {
    return apiError(e);
  }
}
