export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resetGitLabTreeError, hasGitLabTreeError, getCatalogCards } from "@/src/lib/contracts";

export async function POST() {
  try {
    resetGitLabTreeError();
    await getCatalogCards();
    return NextResponse.json({ ok: true, gitError: hasGitLabTreeError() });
  } catch (err) {
    console.error("[retry-git]", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, gitError: true });
  }
}
