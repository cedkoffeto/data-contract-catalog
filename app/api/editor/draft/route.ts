export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { saveContractFile } from "@/src/lib/contract-writer";
import { requireApiAuth } from "@/src/lib/require-auth";
import { extractSessionId } from "@/src/lib/audit-session";

export async function POST(req: Request) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;

    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await req.json()) as { content?: string; filePath?: string; message?: string } | null;
    const content = body?.content;
    const filePath = body?.filePath;

    if (!content || !filePath) {
      return NextResponse.json({ error: "Missing content or filePath" }, { status: 400 });
    }

    const sessionId = extractSessionId(req);
    await saveContractFile(filePath, content, userId, body?.message, sessionId);

    return NextResponse.json({ success: true, path: filePath });
  } catch (e) {
    return apiError(e);
  }
}
