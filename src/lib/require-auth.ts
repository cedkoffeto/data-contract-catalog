import { NextResponse } from "next/server";

import { auth } from "@/src/auth";

/**
 * Returns the session on success, or a 401 Response on failure.
 * Callers: `const session = await requireApiAuth(); if (session instanceof Response) return session;`
 */
export async function requireApiAuth() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return session;
}
