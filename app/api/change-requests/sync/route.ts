export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { listChangeRequests, updateChangeRequestStatus } from "@/src/lib/change-requests";
import { findGitLabMergeRequestByBranch, getGitLabMergeRequest } from "@/src/lib/gitlab";
import { createNotification } from "@/src/lib/notifications";
import { getUserPermissions } from "@/src/lib/rbac";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getUserPermissions(userId);
  if (!permissions.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pending = await listChangeRequests("pending");
  const results: Array<{ id: number; action: string }> = [];

  for (const cr of pending) {
    try {
      // Check MR by stored ID first
      if (cr.gitlabMrId) {
        const mr = await getGitLabMergeRequest(cr.gitlabMrId);
        if (mr.state === "merged") {
          await updateChangeRequestStatus({
            id: cr.id,
            status: "approved",
            resolvedBy: "sync",
          });
          await createNotification({
            userId: cr.editorId,
            contractSlug: cr.contractSlug,
            type: "change_request_approved",
            title: "Change request approved (synced)",
            message: `Your change request #${cr.id} for ${cr.contractSlug} was merged externally.`,
          }).catch(() => {});
          results.push({ id: cr.id, action: "approved" });
        } else if (mr.state === "closed") {
          await updateChangeRequestStatus({
            id: cr.id,
            status: "rejected",
            resolvedBy: "sync",
            rejectionReason: "MR was closed without merge",
          });
          await createNotification({
            userId: cr.editorId,
            contractSlug: cr.contractSlug,
            type: "change_request_rejected",
            title: "Change request rejected (synced)",
            message: `Your change request #${cr.id} for ${cr.contractSlug} was rejected because the MR was closed.`,
          }).catch(() => {});
          results.push({ id: cr.id, action: "rejected" });
        }
        continue;
      }

      // No stored MR ID — try to find by branch pattern
      const branchName = `change-${cr.contractSlug}-${cr.id}`;
      const mr = await findGitLabMergeRequestByBranch(branchName);
      if (!mr) continue;

      if (mr.state === "merged") {
        await updateChangeRequestStatus({
          id: cr.id,
          status: "approved",
          resolvedBy: "sync",
          gitlabMrId: mr.iid,
          gitlabMrUrl: mr.web_url,
        });
        await createNotification({
          userId: cr.editorId,
          contractSlug: cr.contractSlug,
          type: "change_request_approved",
          title: "Change request approved (synced)",
          message: `Your change request #${cr.id} for ${cr.contractSlug} was merged externally.`,
        }).catch(() => {});
        results.push({ id: cr.id, action: "approved" });
      } else if (mr.state === "closed") {
        await updateChangeRequestStatus({
          id: cr.id,
          status: "rejected",
          resolvedBy: "sync",
          gitlabMrId: mr.iid,
          gitlabMrUrl: mr.web_url,
          rejectionReason: "MR was closed without merge",
        });
        await createNotification({
          userId: cr.editorId,
          contractSlug: cr.contractSlug,
          type: "change_request_rejected",
          title: "Change request rejected (synced)",
          message: `Your change request #${cr.id} for ${cr.contractSlug} was rejected because the MR was closed.`,
        }).catch(() => {});
        results.push({ id: cr.id, action: "rejected" });
      }
    } catch {
      // Skip if GitLab API fails for this MR
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
