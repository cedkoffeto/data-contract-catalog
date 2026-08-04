export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { listChangeRequests } from "@/src/lib/change-requests";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET() {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const permissions = await getGlobalPermissions(session);
  const all = await listChangeRequests();

  const items = permissions.includes("admin")
    ? all
    : all.filter((cr) => cr.editorId === userId);

  return NextResponse.json({ items });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
