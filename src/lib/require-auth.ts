import type { Session } from "next-auth";
import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { getUserPermissions, type Permission } from "@/src/lib/rbac";

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

/**
 * Extracts global permissions from the JWT-enriched session.
 * Falls back to DB query if not present in session.
 */
export async function getGlobalPermissions(session: Session): Promise<Permission[]> {
  const extra = session.user as Record<string, unknown>;
  return (extra.permissions as Permission[]) ?? await getUserPermissions(session.user?.name ?? "");
}
