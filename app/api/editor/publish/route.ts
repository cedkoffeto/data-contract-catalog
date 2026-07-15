export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { saveContractFile, deleteContractFile } from "@/src/lib/contract-writer";
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

    const body = (await req.json()) as {
      content?: string;
      targetPath?: string;
      sourcePath?: string;
      message?: string;
    } | null;
    const content = body?.content;
    const targetPath = body?.targetPath;
    const sourcePath = body?.sourcePath;

    if (!content || !targetPath) {
      return NextResponse.json({ error: "Missing content or targetPath" }, { status: 400 });
    }

    const sessionId = extractSessionId(req);

    // Create the published file
    await saveContractFile(targetPath, content, userId, body?.message, sessionId);

    // Delete the draft file if it exists on the repo
    if (sourcePath && sourcePath.startsWith("contracts/draft/")) {
      try {
        await deleteContractFile(sourcePath, userId, `Move draft to ${targetPath}`, sessionId);
      } catch {
        // Non-fatal: the draft may already have been deleted
      }
    }

    return NextResponse.json({ success: true, path: targetPath });
  } catch (e) {
    return apiError(e);
  }
}
