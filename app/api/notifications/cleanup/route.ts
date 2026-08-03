export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { apiError } from "@/src/lib/api-error";
import { getAdminUserIds } from "@/src/lib/rbac";
import { deleteOldReadNotifications } from "@/src/lib/notifications";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function POST(_req: Request) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) return apiError("Authentication required", 401);

  const adminIds = await getAdminUserIds();
  if (!adminIds.includes(userId)) return apiError("Admin access required", 403);

  const deleted = await deleteOldReadNotifications(30);
  return NextResponse.json({ deleted });
}

export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
