export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { listUserProfiles, upsertUserProfile } from "@/src/lib/users";
import { requireApiAuth } from "@/src/lib/require-auth";

export async function GET(request: Request) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const extra = session.user as Record<string, unknown>;
  const firstName = typeof extra.givenName === "string" ? extra.givenName : "";
  const lastName = typeof extra.familyName === "string" ? extra.familyName : "";
  await upsertUserProfile({ userId, firstName, lastName });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const users = await listUserProfiles(q);

  return NextResponse.json({ users });
}
