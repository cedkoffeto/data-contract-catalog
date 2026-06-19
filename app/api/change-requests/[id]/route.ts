import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { approveChangeRequest, getChangeRequest, rejectChangeRequest } from "@/src/lib/change-requests";
import { createNotification } from "@/src/lib/notifications";
import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPermissions } from "@/src/lib/rbac";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getUserPermissions(userId);
  if (!permissions.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const changeRequestId = Number(id);
  if (!Number.isFinite(changeRequestId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await request.json()) as { action: string; rejectionReason?: string };
  const { action, rejectionReason } = body;

  if (action === "approve") {
    const cr = await getChangeRequest(changeRequestId);
    if (!cr) {
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
    }

    const result = await approveChangeRequest(changeRequestId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Approval failed" }, { status: 500 });
    }

    await createNotification({
      userId: cr.editorId,
      contractSlug: cr.contractSlug,
      type: "change_request_approved",
      title: "Change request approved",
      message: `Your change request #${cr.id} for ${cr.contractSlug} has been approved and merged.`,
      metadata: { changeRequestId: cr.id },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "reject") {
    if (!rejectionReason || rejectionReason.trim().length < 3) {
      return NextResponse.json({ error: "Rejection reason is required (min. 3 characters)" }, { status: 400 });
    }

    const cr = await getChangeRequest(changeRequestId);
    if (!cr) {
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
    }

    const result = await rejectChangeRequest(changeRequestId, userId, rejectionReason.trim());

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Rejection failed" }, { status: 500 });
    }

    await createNotification({
      userId: cr.editorId,
      contractSlug: cr.contractSlug,
      type: "change_request_rejected",
      title: "Change request rejected",
      message: `Your change request #${cr.id} for ${cr.contractSlug} has been rejected: ${rejectionReason.trim()}`,
      metadata: { changeRequestId: cr.id, rejectionReason: rejectionReason.trim() },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
}
