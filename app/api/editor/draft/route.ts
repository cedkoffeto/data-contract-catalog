export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/src/lib/api-error";

import { saveContractFile } from "@/src/lib/contract-writer";
import { requireApiAuth } from "@/src/lib/require-auth";
import { extractSessionId } from "@/src/lib/audit-session";

const DraftSchema = z.object({
  content: z.string().min(1, "content is required").max(500_000),
  filePath: z.string().min(1, "filePath is required").max(500),
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

    const parsed = DraftSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 400);
    }

    const { content, filePath, message } = parsed.data;
    const sessionId = extractSessionId(req);
    await saveContractFile(filePath, content, userId, message, sessionId);

    return NextResponse.json({ success: true, path: filePath });
  } catch (e) {
    return apiError(e);
  }
}
