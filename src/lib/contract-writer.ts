import fs from "node:fs";
import path from "node:path";

import { writeAuditLog } from "@/src/lib/audit";
import { getGitLabClient } from "@/src/lib/gitlab";

const contractsRoot = process.env.CONTRACTS_PATH ?? path.join(process.cwd(), "contracts");

function validateContractPath(filePath: string): void {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.includes("\0")) {
    throw new Error("Path traversal detected");
  }
  if (!/^contracts\/(draft\/|published\/)?(bronze|silver|gold)\//.test(normalized) &&
      !/^contracts\/(draft\/|published\/)?[a-zA-Z0-9_-]+\//.test(normalized)) {
    throw new Error("Path must be under contracts/{maturity}/ or contracts/draft/{maturity}/");
  }
}

function hasGitLabConfig() {
  return Boolean(
    process.env.GITLAB_BASE_URL?.trim() && process.env.GITLAB_PROJECT_ID?.trim() && process.env.GITLAB_TOKEN?.trim()
  );
}

export async function saveContractFile(
  filePath: string,
  content: string,
  actorId: string,
  commitMessage?: string,
  sessionId?: string,
): Promise<{ commitId?: string }> {
  if (hasGitLabConfig()) {
    return saveToGitLab(filePath, content, actorId, commitMessage, sessionId);
  }

  saveToLocal(filePath, content);
  return {};
}

export async function deleteContractFile(
  filePath: string,
  actorId: string,
  commitMessage?: string,
  sessionId?: string,
): Promise<void> {
  if (hasGitLabConfig()) {
    await deleteFromGitLab(filePath, actorId, commitMessage, sessionId);
  } else {
    deleteFromLocal(filePath);
  }
}

async function deleteFromGitLab(
  filePath: string,
  actorId: string,
  commitMessage?: string,
  sessionId?: string,
): Promise<void> {
  validateContractPath(filePath);
  const { api, config } = getGitLabClient();
  const branch = config.ref;

  const msg = commitMessage || `Delete ${filePath}\n\n[skip-ci]`;

  const options = {
    authorEmail: `${actorId}@users.noreply.gitlab.com`,
    authorName: actorId,
  };

  await api.RepositoryFiles.remove(config.projectId, filePath, branch, msg, options);

  await writeAuditLog({
    action: "contract.delete",
    actorId,
    targetType: "contract",
    targetId: filePath,
    details: { filePath, mode: "gitlab" },
    sessionId,
  });
}

function deleteFromLocal(filePath: string): void {
  validateContractPath(filePath);
  const normalized = path.normalize(filePath.replace(/^contracts\//, ""));
  const fullPath = path.resolve(contractsRoot, normalized);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

async function saveToGitLab(
  filePath: string,
  content: string,
  actorId: string,
  commitMessage?: string,
  sessionId?: string,
): Promise<{ commitId?: string }> {
  validateContractPath(filePath);
  const { api, config } = getGitLabClient();
  const branch = config.ref;

  const msg = commitMessage || `Update ${filePath}

[skip-ci]`;

  const options = {
    encoding: "text" as const,
    authorEmail: `${actorId}@users.noreply.gitlab.com`,
    authorName: actorId,
  };

  try {
    await api.RepositoryFiles.edit(config.projectId, filePath, branch, content, msg, options);
  } catch {
    await api.RepositoryFiles.create(config.projectId, filePath, branch, content, msg, options);
  }

  await writeAuditLog({
    action: "contract.update",
    actorId,
    targetType: "contract",
    targetId: filePath,
    details: { filePath, mode: "gitlab" },
    sessionId,
  });

  return {};
}

function saveToLocal(filePath: string, content: string): void {
  validateContractPath(filePath);
  const normalized = path.normalize(filePath.replace(/^contracts\//, ""));
  const fullPath = path.resolve(contractsRoot, normalized);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}
