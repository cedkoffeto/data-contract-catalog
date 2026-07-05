import fs from "node:fs";
import path from "node:path";

import { writeAuditLog } from "@/src/lib/audit";
import { getGitLabClient } from "@/src/lib/gitlab";

const contractsRoot = process.env.CONTRACTS_PATH ?? path.join(process.cwd(), "contracts");

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

async function saveToGitLab(
  filePath: string,
  content: string,
  actorId: string,
  commitMessage?: string,
  sessionId?: string,
): Promise<{ commitId?: string }> {
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
  const normalized = path.normalize(filePath.replace(/^contracts\//, ""));
  const fullPath = path.resolve(contractsRoot, normalized);
  if (!fullPath.startsWith(path.resolve(contractsRoot))) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}
