export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { listUserProfiles, upsertUserProfile } from "@/src/lib/users";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(request: Request) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const extra = session.user as Record<string, unknown>;
  const firstName = typeof extra.givenName === "string" ? extra.givenName : "";
  const lastName = typeof extra.familyName === "string" ? extra.familyName : "";
  await upsertUserProfile({ userId, firstName, lastName });

  const permissions = await getGlobalPermissions(session);
  if (!permissions.includes("admin")) {
    return apiError("Forbidden", 403);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const users = await listUserProfiles(q);

  return NextResponse.json({ users });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
