export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { insertExternalChangeRequest, listChangeRequests, updateChangeRequestStatus } from "@/src/lib/change-requests";
import { findGitLabMergeRequestByBranch, getGitLabClient, getGitLabMergeRequest } from "@/src/lib/gitlab";
import { createNotification } from "@/src/lib/notifications";
import { getGlobalPermissions } from "@/src/lib/require-auth";
import { getSubscribers } from "@/src/lib/subscriptions";

function extractContractSlug(filePath: string): string | null {
  const match = filePath.match(/^contracts\/(.+)\.(yaml|yml)$/i);
  return match ? match[1] : null;
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getGlobalPermissions(session);
  if (!permissions.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Array<{ id: number; action: string }> = [];

  // ── Step 1: Sync existing CRs ──
  const pending = await listChangeRequests("pending");
  const conflicted = await listChangeRequests("conflicted");
  const all = [...pending, ...conflicted];

  for (const cr of all) {
    try {
      if (cr.gitlabMrId) {
        const mr = await getGitLabMergeRequest(cr.gitlabMrId);
        if (mr.state === "merged") {
          await updateChangeRequestStatus({ id: cr.id, status: "approved", resolvedBy: "sync" });
          await createNotification({
            userId: cr.editorId, contractSlug: cr.contractSlug,
            type: "change_request_approved", title: "Change request approved (synced)",
            message: `Your change request #${cr.id} for ${cr.contractSlug} was merged externally.`,
          }).catch(() => {});
          results.push({ id: cr.id, action: "approved" });
        } else if (mr.state === "closed") {
          await updateChangeRequestStatus({ id: cr.id, status: "rejected", resolvedBy: "sync", rejectionReason: "MR was closed without merge" });
          await createNotification({
            userId: cr.editorId, contractSlug: cr.contractSlug,
            type: "change_request_rejected", title: "Change request rejected (synced)",
            message: `Your change request #${cr.id} for ${cr.contractSlug} was rejected because the MR was closed.`,
          }).catch(() => {});
          results.push({ id: cr.id, action: "rejected" });
        }
        continue;
      }

      const branchName = `change-${cr.contractSlug}-${cr.id}`;
      const mr = await findGitLabMergeRequestByBranch(branchName);
      if (!mr) continue;

      if (mr.state === "merged") {
        await updateChangeRequestStatus({ id: cr.id, status: "approved", resolvedBy: "sync", gitlabMrId: mr.iid, gitlabMrUrl: mr.web_url });
        results.push({ id: cr.id, action: "approved" });
      } else if (mr.state === "closed") {
        await updateChangeRequestStatus({ id: cr.id, status: "rejected", resolvedBy: "sync", gitlabMrId: mr.iid, gitlabMrUrl: mr.web_url, rejectionReason: "MR was closed without merge" });
        results.push({ id: cr.id, action: "rejected" });
      }
      } catch { console.warn("[sync] Failed to sync MR for CR", cr.id); }
  }

  // ── Step 2: Scan external MRs not tracked in DB ──
  const existingMrUrls = new Set(
    (await listChangeRequests()).map((cr) => cr.gitlabMrUrl).filter(Boolean),
  );

  async function processMr(
    api: ReturnType<typeof getGitLabClient>["api"],
    config: ReturnType<typeof getGitLabClient>["config"],
    mr: { iid: number; web_url: string; source_branch: string; author?: { username: string } },
    status: "approved" | "pending",
  ) {
    if (existingMrUrls.has(mr.web_url)) return;
    if (mr.source_branch.startsWith("change-")) return;

    let changes: Array<{ new_path: string }>;
    try {
      changes = (await api.MergeRequests.showChanges(config.projectId, mr.iid)).changes as Array<{ new_path: string }>;
    } catch { console.warn("[sync] Failed to get changes for MR", mr.iid);
      return;
    }

    const touchedSlugs = new Set<string>();
    for (const change of changes) {
      const slug = extractContractSlug(change.new_path);
      if (slug) touchedSlugs.add(slug);
    }

    if (touchedSlugs.size === 0) return;

    const editorId = mr.author?.username ?? "external";
    for (const slug of touchedSlugs) {
      try {
        const cr = await insertExternalChangeRequest({
          contractSlug: slug,
          editorId,
          gitlabMrId: mr.iid,
          gitlabMrUrl: mr.web_url,
          status,
        });
        results.push({ id: cr.id, action: `imported_${status}` });
        if (status === "approved") {
          const subscribers = await getSubscribers(slug).catch(() => []);
          await Promise.allSettled(
            subscribers
              .filter((s) => s.user_id !== editorId)
              .map((s) => createNotification({
                userId: s.user_id,
                contractSlug: slug,
                type: "contract_updated",
                title: `Contract updated: ${slug}`,
                message: `Contract ${slug} was updated via an external merge request.`,
                metadata: { contractSlug: slug },
              }))
          );
        }
      } catch { console.warn("[sync] Failed to insert external CR for", slug); }
    }
  }

  try {
    const { api, config } = getGitLabClient();

    const mergedMrs = (await api.MergeRequests.all({
      projectId: config.projectId,
      state: "merged",
      perPage: 50,
      orderBy: "updated_at",
      sort: "desc",
    })) as Array<{ iid: number; web_url: string; source_branch: string; author?: { username: string } }>;

    for (const mr of mergedMrs) {
      await processMr(api, config, mr, "approved");
    }

    const openedMrs = (await api.MergeRequests.all({
      projectId: config.projectId,
      state: "opened",
      perPage: 50,
      orderBy: "updated_at",
      sort: "desc",
    })) as Array<{ iid: number; web_url: string; source_branch: string; author?: { username: string } }>;

    for (const mr of openedMrs) {
      await processMr(api, config, mr, "pending");
    }
  } catch { console.warn("[sync] GitLab API unavailable, skip external scan"); }

  return NextResponse.json({ synced: results.length, results });
}
