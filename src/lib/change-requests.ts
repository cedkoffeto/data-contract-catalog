import { prisma } from "@/src/lib/prisma";
import { getGitLabClient, getGitLabContractFilePath } from "@/src/lib/gitlab";
import type { ContractChangeRequest } from "@/src/lib/types";
import { logger } from "@/src/lib/logger";


function toChangeRequest(row: {
  id: number; contractSlug: string; editorId: string; yamlContent: string;
  originalSha: string; status: string; gitlabMrId: number | null;
  gitlabMrUrl: string; rejectionReason: string; createdAt: Date;
  resolvedAt: Date | null; resolvedBy: string | null; source: string;
  updatedAt: Date | null;
}): ContractChangeRequest {
  return {
    id: row.id,
    contractSlug: row.contractSlug,
    editorId: row.editorId,
    yamlContent: row.yamlContent,
    originalSha: row.originalSha,
    status: row.status as ContractChangeRequest["status"],
    gitlabMrId: row.gitlabMrId,
    gitlabMrUrl: row.gitlabMrUrl,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedBy: row.resolvedBy,
    source: row.source as "app" | "external",
    updatedAt: row.updatedAt?.toISOString() ?? "",
  };
}

export async function createChangeRequest(params: {
  contractSlug: string;
  editorId: string;
  yamlContent: string;
  originalSha: string;
  commitMessage?: string;
}): Promise<ContractChangeRequest> {
  const cr = toChangeRequest(
    await prisma.contractChangeRequest.create({
      data: {
        contractSlug: params.contractSlug,
        editorId: params.editorId,
        yamlContent: params.yamlContent,
        originalSha: params.originalSha,
      },
    }),
  );

  // Create GitLab branch, commit, and MR
  try {
    const { api, config } = getGitLabClient();
    const filePath = await getGitLabContractFilePath(cr.contractSlug);
    const branchName = `change-${cr.contractSlug}-${cr.id}-${Date.now()}`;
    const commitMsg = params.commitMessage || `Update contract ${cr.contractSlug} (change request #${cr.id})`;
    const lines = commitMsg.split("\n");
    const mrTitle = lines[0].slice(0, 255);
    const mrBody = lines.slice(1).join("\n").trim();
    const description = `Change request #${cr.id} by ${cr.editorId}${mrBody ? `\n\n${mrBody}` : ""}`;

    await api.Branches.create(config.projectId, branchName, config.ref);

    await api.RepositoryFiles.edit(
      config.projectId,
      filePath,
      branchName,
      cr.yamlContent,
      commitMsg,
    );

    const mr = await api.MergeRequests.create(
      config.projectId,
      branchName,
      config.ref,
      mrTitle,
      { description },
    );

    const mrId = mr.iid as number;
    const mrUrl = (mr.web_url as string) ?? "";

    await updateChangeRequestStatus({
      id: cr.id,
      status: "pending",
      gitlabMrId: mrId,
      gitlabMrUrl: mrUrl,
    });

    return { ...cr, gitlabMrId: mrId, gitlabMrUrl: mrUrl };
  } catch (error) {
    // If MR creation fails, keep the CR in DB for logging but mark as rejected
    const msg = error instanceof Error ? error.message : "Unknown error";
    logger.error("[change-requests] MR creation failed:", msg);
    await updateChangeRequestStatus({
      id: cr.id,
      status: "rejected",
      resolvedBy: "system",
      rejectionReason: `MR creation failed: ${msg}`,
    });
    return { ...cr, status: "rejected", rejectionReason: `MR creation failed: ${msg}` };
  }
}

export async function insertExternalChangeRequest(params: {
  contractSlug: string;
  editorId: string;
  gitlabMrId: number;
  gitlabMrUrl: string;
  status: "approved" | "pending" | "conflicted";
  mrCreatedAt?: Date;
}): Promise<ContractChangeRequest> {
  const isResolved = params.status === "approved";
  const row = await prisma.contractChangeRequest.create({
    data: {
      contractSlug: params.contractSlug,
      editorId: params.editorId,
      yamlContent: "",
      status: params.status,
      gitlabMrId: params.gitlabMrId,
      gitlabMrUrl: params.gitlabMrUrl,
      resolvedBy: isResolved ? params.editorId : null,
      resolvedAt: isResolved ? new Date() : null,
      source: "external",
      createdAt: params.mrCreatedAt ?? new Date(),
    },
  });
  return toChangeRequest(row);
}

export async function listChangeRequests(
  status?: ContractChangeRequest["status"],
  limit = 200,
): Promise<ContractChangeRequest[]> {
  const where = status ? { status } : {};
  const rows = await prisma.contractChangeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(1, limit), 500),
  });
  return rows.map(toChangeRequest);
}

export async function getChangeRequest(id: number): Promise<ContractChangeRequest | null> {
  const row = await prisma.contractChangeRequest.findUnique({ where: { id } });
  return row ? toChangeRequest(row) : null;
}

export async function updateChangeRequestStatus(params: {
  id: number;
  status: ContractChangeRequest["status"];
  resolvedBy?: string | null;
  gitlabMrId?: number;
  gitlabMrUrl?: string;
  rejectionReason?: string;
}): Promise<void> {
  const isResolved = params.status === "approved" || params.status === "rejected";
  await prisma.contractChangeRequest.update({
    where: { id: params.id },
    data: {
      status: params.status,
      resolvedBy: isResolved ? (params.resolvedBy ?? null) : null,
      resolvedAt: isResolved ? new Date() : null,
      updatedAt: new Date(),
      ...(params.gitlabMrId !== undefined ? { gitlabMrId: params.gitlabMrId } : {}),
      ...(params.gitlabMrUrl !== undefined ? { gitlabMrUrl: params.gitlabMrUrl } : {}),
      ...(params.rejectionReason !== undefined ? { rejectionReason: params.rejectionReason } : {}),
    },
  });
}

export async function mergeChangeRequest(
  id: number,
  resolverId: string,
): Promise<{ success: boolean; error?: string }> {
  const cr = await getChangeRequest(id);
  if (!cr) return { success: false, error: "Change request not found" };
  if (cr.status !== "pending") return { success: false, error: "Change request is not pending" };
  if (!cr.gitlabMrId) return { success: false, error: "No GitLab MR associated with this change request" };

  try {
    const { api, config } = getGitLabClient();
    await api.MergeRequests.accept(config.projectId, cr.gitlabMrId, { shouldRemoveSourceBranch: true });

    await updateChangeRequestStatus({
      id,
      status: "approved",
      resolvedBy: resolverId,
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error during merge";
    const isConflict = msg.toLowerCase().includes("conflict") || msg.toLowerCase().includes("merge conflict");
    logger.error("[change-requests] Merge failed:", msg);

    if (isConflict) {
      await updateChangeRequestStatus({
        id,
        status: "conflicted",
        rejectionReason: "Conflit de merge détecté — rebase nécessaire sur la branche source avant de pouvoir merger",
      });
      return { success: false, error: "Conflit de merge détecté — rebase nécessaire sur la branche source avant de pouvoir merger" };
    }

    return { success: false, error: msg };
  }
}

export async function rejectChangeRequest(
  id: number,
  resolverId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const cr = await getChangeRequest(id);
  if (!cr) return { success: false, error: "Change request not found" };
  if (cr.status !== "pending") return { success: false, error: "Change request is not pending" };

  // Close the GitLab MR if it exists
  if (cr.gitlabMrId) {
    try {
      const { api: gitlab } = getGitLabClient();
      const { config } = getGitLabClient();
      await gitlab.MergeRequests.edit(config.projectId, cr.gitlabMrId, { stateEvent: "close" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error("[change-requests] Failed to close MR:", msg);
    }
  }

  await updateChangeRequestStatus({
    id,
    status: "rejected",
    resolvedBy: resolverId,
    rejectionReason: reason,
  });

  return { success: true };
}
