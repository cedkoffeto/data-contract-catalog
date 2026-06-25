import { insertReturning, execute, query } from "@/src/lib/db";
import { getGitLabClient, getGitLabContractFilePath } from "@/src/lib/gitlab";
import type { ContractChangeRequest } from "@/src/lib/types";
import type { SqlValue } from "sql.js";

function toChangeRequest(row: Record<string, unknown>): ContractChangeRequest {
  return {
    id: row.id as number,
    contractSlug: row.contract_slug as string,
    editorId: row.editor_id as string,
    yamlContent: row.yaml_content as string,
    originalSha: row.original_sha as string,
    status: row.status as ContractChangeRequest["status"],
    gitlabMrId: row.gitlab_mr_id as number | null,
    gitlabMrUrl: row.gitlab_mr_url as string,
    rejectionReason: row.rejection_reason as string,
    createdAt: row.created_at as string,
    resolvedAt: row.resolved_at as string | null,
    resolvedBy: row.resolved_by as string | null,
    source: (row.source as string) as "app" | "external",
    updatedAt: row.updated_at as string,
  };
}

export async function createChangeRequest(params: {
  contractSlug: string;
  editorId: string;
  yamlContent: string;
  originalSha: string;
  commitMessage?: string;
}): Promise<ContractChangeRequest> {
  const rows = await insertReturning<Record<string, unknown>>(
    `INSERT INTO contract_change_requests (contract_slug, editor_id, yaml_content, original_sha)
     VALUES (?, ?, ?, ?) RETURNING *`,
    [params.contractSlug, params.editorId, params.yamlContent, params.originalSha],
  );
  if (!rows[0]) throw new Error("Failed to create change request row");
  const cr = toChangeRequest(rows[0]);

  // Create GitLab branch, commit, and MR
  try {
    const { api, config } = getGitLabClient();
    const filePath = await getGitLabContractFilePath(cr.contractSlug);
    const branchName = `change-${cr.contractSlug}-${cr.id}`;
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
      resolvedBy: cr.editorId,
      gitlabMrId: mrId,
      gitlabMrUrl: mrUrl,
    });

    return { ...cr, gitlabMrId: mrId, gitlabMrUrl: mrUrl };
  } catch (error) {
    // If MR creation fails, keep the CR in DB for logging but mark as rejected
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[change-requests] MR creation failed:", msg);
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
  status: "approved" | "pending";
}): Promise<ContractChangeRequest> {
  const rows = await insertReturning<Record<string, unknown>>(
    `INSERT INTO contract_change_requests (contract_slug, editor_id, yaml_content, original_sha, status, gitlab_mr_id, gitlab_mr_url, resolved_by, resolved_at, source)
     VALUES (?, ?, '', '', ?, ?, ?, ?, ?, 'external') RETURNING *`,
    [
      params.contractSlug,
      params.editorId,
      params.status,
      params.gitlabMrId,
      params.gitlabMrUrl,
      params.editorId,
      new Date().toISOString(),
    ],
  );
  if (!rows[0]) throw new Error("Failed to insert external change request");
  return toChangeRequest(rows[0]);
}

export async function listChangeRequests(
  status?: ContractChangeRequest["status"],
): Promise<ContractChangeRequest[]> {
  let sql = "SELECT * FROM contract_change_requests";
  const params: SqlValue[] = [];
  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC";
  const rows = await query<Record<string, unknown>>(sql, params);
  return rows.map(toChangeRequest);
}

export async function getChangeRequest(id: number): Promise<ContractChangeRequest | null> {
  const rows = await query<Record<string, unknown>>(
    "SELECT * FROM contract_change_requests WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? toChangeRequest(rows[0]) : null;
}

export async function updateChangeRequestStatus(params: {
  id: number;
  status: ContractChangeRequest["status"];
  resolvedBy: string;
  gitlabMrId?: number;
  gitlabMrUrl?: string;
  rejectionReason?: string;
}): Promise<void> {
  const sets: string[] = [];
  const vals: SqlValue[] = [];

  sets.push("status = ?");
  vals.push(params.status);

  sets.push("resolved_by = ?");
  vals.push(params.resolvedBy);

  sets.push("resolved_at = ?");
  vals.push(new Date().toISOString());

  sets.push("updated_at = ?");
  vals.push(new Date().toISOString());

  if (params.gitlabMrId !== undefined) {
    sets.push("gitlab_mr_id = ?");
    vals.push(params.gitlabMrId);
  }

  if (params.gitlabMrUrl !== undefined) {
    sets.push("gitlab_mr_url = ?");
    vals.push(params.gitlabMrUrl);
  }

  if (params.rejectionReason !== undefined) {
    sets.push("rejection_reason = ?");
    vals.push(params.rejectionReason);
  }

  vals.push(params.id);
  await execute(
    `UPDATE contract_change_requests SET ${sets.join(", ")} WHERE id = ?`,
    vals,
  );
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
    console.error("[change-requests] Merge failed:", msg);

    if (isConflict) {
      await updateChangeRequestStatus({
        id,
        status: "conflicted",
        resolvedBy: resolverId,
        rejectionReason: "Conflit détecté, merci de merger manuellement sur GitLab",
      });
      return { success: false, error: "Conflit détecté, merci de merger manuellement sur GitLab" };
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
      console.error("[change-requests] Failed to close MR:", msg);
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
