export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { auth } from "@/src/auth";
import { insertExternalChangeRequest, listChangeRequests, updateChangeRequestStatus } from "@/src/lib/change-requests";
import { getGitLabClient, getGitLabMergeRequest } from "@/src/lib/gitlab";
import { createNotification } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { getGlobalPermissions } from "@/src/lib/require-auth";
import { getSubscribers } from "@/src/lib/subscriptions";
import { withErrorHandling } from "@/src/lib/with-error-handling";
import { logger } from "@/src/lib/logger";

function extractContractSlug(filePath: string): string | null {
  const match = filePath.match(/^contracts\/(.+)\.(yaml|yml)$/i);
  return match ? match[1] : null;
}

function parseChangeBranch(branchName: string): { slug: string; id: number } | null {
  const match = branchName.match(/^change-(.+)-(\d+)-\d+$/);
  if (!match) return null;
  return { slug: match[1], id: Number(match[2]) };
}

async function fetchAllMrs(
  api: ReturnType<typeof getGitLabClient>["api"],
  projectId: string,
  state: "merged" | "opened" | "closed",
): Promise<Array<{ iid: number; web_url: string; source_branch: string; author?: { username: string }; has_conflicts?: boolean; merge_status?: string; created_at?: string }>> {
  const PER_PAGE = 100;
  const MAX_PAGES = 20;
  const all: Array<{ iid: number; web_url: string; source_branch: string; author?: { username: string }; has_conflicts?: boolean; merge_status?: string; created_at?: string }> = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = (await api.MergeRequests.all({
      projectId,
      state,
      perPage: PER_PAGE,
      page,
      orderBy: "updated_at",
      sort: "desc",
    })) as Array<{ iid: number; web_url: string; source_branch: string; author?: { username: string }; has_conflicts?: boolean; merge_status?: string; created_at?: string }>;

    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  return all;
}

async function POST() {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const permissions = await getGlobalPermissions(session);
  if (!permissions.includes("admin")) {
    return apiError("Forbidden", 403);
  }

  const results: Array<{ id: number; action: string }> = [];

  // ── Step 1: Sync ALL CRs with a GitLab MR (Git is source of truth) ──
  const trackedMrs = await prisma.contractChangeRequest.findMany({
    where: { gitlabMrId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 500,
  }).then((rows) => rows.map((r) => ({
    id: r.id,
    contractSlug: r.contractSlug,
    editorId: r.editorId,
    status: r.status,
    gitlabMrId: r.gitlabMrId,
    createdAt: r.createdAt,
  })));

  for (const cr of trackedMrs) {
    try {
      if (!cr.gitlabMrId) continue;
      const mr = await getGitLabMergeRequest(cr.gitlabMrId);

      // Correct createdAt to match MR creation date
      if (mr.created_at) {
        const mrDate = new Date(mr.created_at);
        if (mrDate.getTime() !== new Date(cr.createdAt).getTime()) {
          await prisma.contractChangeRequest.update({
            where: { id: cr.id },
            data: { createdAt: mrDate },
          });
        }
      }

      if (mr.state === "merged" && cr.status !== "approved") {
        await updateChangeRequestStatus({ id: cr.id, status: "approved" });
        await createNotification({
          userId: cr.editorId, contractSlug: cr.contractSlug,
          type: "change_request_approved", title: "Change request approved (synced)",
          message: `Your change request #${cr.id} for ${cr.contractSlug} was merged externally.`,
        }).catch(() => {});
        results.push({ id: cr.id, action: "approved" });
      } else if (mr.state === "closed" && cr.status !== "rejected") {
        await updateChangeRequestStatus({ id: cr.id, status: "rejected", rejectionReason: "MR was closed without merge" });
        await createNotification({
          userId: cr.editorId, contractSlug: cr.contractSlug,
          type: "change_request_rejected", title: "Change request rejected (synced)",
          message: `Your change request #${cr.id} for ${cr.contractSlug} was rejected because the MR was closed.`,
        }).catch(() => {});
        results.push({ id: cr.id, action: "rejected" });
      } else if (mr.has_conflicts && cr.status !== "conflicted") {
        await updateChangeRequestStatus({
          id: cr.id, status: "conflicted",
          rejectionReason: "Conflit de merge détecté — rebase nécessaire sur la branche source",
        });
        await createNotification({
          userId: cr.editorId, contractSlug: cr.contractSlug,
          type: "change_request_rejected", title: "Change request has conflicts (synced)",
          message: `Your change request #${cr.id} for ${cr.contractSlug} has merge conflicts. A rebase is required.`,
        }).catch(() => {});
        results.push({ id: cr.id, action: "conflicted" });
      } else if (!mr.has_conflicts && cr.status === "conflicted") {
        await updateChangeRequestStatus({
          id: cr.id, status: "pending",
          rejectionReason: "",
        });
        await createNotification({
          userId: cr.editorId, contractSlug: cr.contractSlug,
          type: "change_request_approved", title: "Conflict resolved (synced)",
          message: `Your change request #${cr.id} for ${cr.contractSlug} is no longer conflicted.`,
        }).catch(() => {});
        results.push({ id: cr.id, action: "unblocked" });
      }
    } catch { logger.warn("[sync] Failed to sync MR for CR", cr.id); }
  }

  // ── Step 2: Scan ALL MRs from GitLab ──
  const existingMrUrls = new Set(
    (await listChangeRequests()).map((cr) => cr.gitlabMrUrl).filter(Boolean),
  );
  const existingMrIds = new Set(
    (await listChangeRequests()).map((cr) => cr.gitlabMrId).filter(Boolean),
  );

  async function processMr(
    api: ReturnType<typeof getGitLabClient>["api"],
    config: ReturnType<typeof getGitLabClient>["config"],
    mr: { iid: number; web_url: string; source_branch: string; author?: { username: string }; has_conflicts?: boolean; created_at?: string },
    status: "approved" | "pending" | "conflicted",
  ) {
    if (existingMrUrls.has(mr.web_url)) return;
    if (existingMrIds.has(mr.iid)) return;

    const parsed = parseChangeBranch(mr.source_branch);

    if (parsed) {
      // This is a change-* MR from the app. Import it as external.
      try {
        const cr = await insertExternalChangeRequest({
          contractSlug: parsed.slug,
          editorId: mr.author?.username ?? "external",
          gitlabMrId: mr.iid,
          gitlabMrUrl: mr.web_url,
          status: status === "conflicted" ? "pending" : status,
          mrCreatedAt: mr.created_at ? new Date(mr.created_at) : undefined,
        });
        results.push({ id: cr.id, action: `imported_${status}` });
      } catch { logger.warn("[sync] Failed to import change MR", mr.iid); }
      return;
    }

    // External MR (not change-* branch): inspect file changes
    let changes: Array<{ new_path: string }>;
    try {
      changes = (await api.MergeRequests.showChanges(config.projectId, mr.iid)).changes as Array<{ new_path: string }>;
    } catch { logger.warn("[sync] Failed to get changes for MR", mr.iid);
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
          mrCreatedAt: mr.created_at ? new Date(mr.created_at) : undefined,
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
      } catch { logger.warn("[sync] Failed to insert external CR for", slug); }
    }
  }

  try {
    const { api, config } = getGitLabClient();

    const mergedMrs = await fetchAllMrs(api, config.projectId, "merged");
    for (const mr of mergedMrs) {
      await processMr(api, config, mr, "approved");
    }

    const openedMrs = await fetchAllMrs(api, config.projectId, "opened");
    for (const mr of openedMrs) {
      const status = mr.has_conflicts ? "conflicted" as const : "pending" as const;
      await processMr(api, config, mr, status);
    }
  } catch { logger.warn("[sync] GitLab API unavailable, skip external scan"); }

  return NextResponse.json({ synced: results.length, results });
}

export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
