export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { mergeChangeRequest, getChangeRequest, rejectChangeRequest } from "@/src/lib/change-requests";
import { createNotification } from "@/src/lib/notifications";
import { getSubscribers } from "@/src/lib/subscriptions";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name ?? "";

  const permissions = await getGlobalPermissions(session);
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

  if (action === "merge") {
    const cr = await getChangeRequest(changeRequestId);
    if (!cr) {
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
    }

    const result = await mergeChangeRequest(changeRequestId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Merge failed" }, { status: 409 });
    }

    // Notify the editor
    await createNotification({
      userId: cr.editorId,
      contractSlug: cr.contractSlug,
      type: "change_request_merged",
      title: "Change request merged",
      message: `Your change request #${cr.id} for ${cr.contractSlug} has been merged.`,
      metadata: { changeRequestId: cr.id },
    });

    // Notify subscribers of the contract
    const subscribers = await getSubscribers(cr.contractSlug);
    for (const sub of subscribers) {
      if (sub.user_id === cr.editorId) continue; // editor already notified
      await createNotification({
        userId: sub.user_id,
        contractSlug: cr.contractSlug,
        type: "contract_updated",
        title: "Contract updated",
        message: `Contract ${cr.contractSlug} has been updated (change request #${cr.id}).`,
        metadata: { changeRequestId: cr.id, contractSlug: cr.contractSlug },
      });
    }

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

  return NextResponse.json({ error: "Invalid action. Must be 'merge' or 'reject'." }, { status: 400 });
}
