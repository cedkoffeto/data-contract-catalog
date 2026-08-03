export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/src/lib/api-error";

import { saveContractFile, deleteContractFile } from "@/src/lib/contract-writer";
import { requireApiAuth } from "@/src/lib/require-auth";
import { extractSessionId } from "@/src/lib/audit-session";

const PublishSchema = z.object({
  content: z.string().min(1, "content is required").max(500_000),
  targetPath: z.string().min(1, "targetPath is required").max(500),
  sourcePath: z.string().max(500).optional(),
  message: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;

    const userId = session?.user?.name;
    if (!userId) {
      return apiError("Authentication required", 401);
    }

    const parsed = PublishSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 400);
    }

    const { content, targetPath, sourcePath, message } = parsed.data;
    const sessionId = extractSessionId(req);

    await saveContractFile(targetPath, content, userId, message, sessionId);

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
