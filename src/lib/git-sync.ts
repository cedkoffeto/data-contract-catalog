import { gunzipSync } from "node:zlib";
import { Gitlab, GitbeakerTimeoutError } from "@gitbeaker/rest";
import { getGitSourceRef } from "@/src/lib/git-source";
import { logger } from "@/src/lib/logger";

const TAR_HEADER_SIZE = 512;

export function parseTar(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;

  while (offset + TAR_HEADER_SIZE <= buffer.length) {
    const header = buffer.subarray(offset, offset + TAR_HEADER_SIZE);
    if (header[0] === 0) break;
    offset += TAR_HEADER_SIZE;

    let name = header.toString("utf-8", 0, 100).replace(/\0.*/, "").trim();
    const prefix = header.toString("utf-8", 345, 500).replace(/\0.*/, "").trim();
    if (prefix) name = `${prefix}/${name}`;

    const sizeStr = header.toString("utf-8", 124, 136).replace(/\0/g, "").trim();
    const size = parseInt(sizeStr, 8);
    if (Number.isNaN(size)) break;

    const typeFlag = header[156];
    const isFile = typeFlag === 0 || typeFlag === 48;

    if (isFile && name) {
      const data = buffer.subarray(offset, offset + size);
      files.set(name, Buffer.from(data));
    }

    offset += Math.ceil(size / TAR_HEADER_SIZE) * TAR_HEADER_SIZE;
  }

  return files;
}

const RETRY_MAX = 1;
const RETRY_DELAY_MS = 1000;

export async function retryOnTimeout<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable =
        (error instanceof TypeError && (error as Error).message === "fetch failed") ||
        error instanceof GitbeakerTimeoutError;
      if (attempt < RETRY_MAX && isRetryable) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      throw error;
    }
  }
}

export function hasGitLabConfig(): boolean {
  return Boolean(
    process.env.GITLAB_BASE_URL?.trim() && process.env.GITLAB_PROJECT_ID?.trim() && process.env.GITLAB_TOKEN?.trim()
  );
}

export function getGitLabClient(): { api: InstanceType<typeof Gitlab>; projectId: string; ref: string } | null {
  const baseUrl = process.env.GITLAB_BASE_URL?.trim();
  const projectId = process.env.GITLAB_PROJECT_ID?.trim();
  const token = process.env.GITLAB_TOKEN?.trim();
  const ref = getGitSourceRef();

  if (!baseUrl || !projectId || !token) {
    return null;
  }

  return {
    api: new Gitlab({
      host: baseUrl.replace(/\/$/, ""),
      token,
      queryTimeout: 8000,
    }),
    projectId,
    ref
  };
}

export async function downloadGitLabArchive(client: { projectId: string; ref: string; api: InstanceType<typeof Gitlab> }): Promise<Map<string, Buffer>> {
  logger.info("[gitlab.archive] Downloading archive for", {
    projectId: client.projectId,
    ref: client.ref,
  });

  const blob = await retryOnTimeout(() =>
    client.api.Repositories.showArchive(client.projectId, {
      sha: client.ref,
      fileType: "tar.gz" as never,
    }) as Promise<Blob>
  );

  const compressed = Buffer.from(await blob.arrayBuffer());
  const tarBuffer = gunzipSync(compressed);
  const allFiles = parseTar(tarBuffer);

  // Strip the leading repo-name-commithash/ prefix from tar entries
  const topLevelDir = allFiles.keys().next().value?.split("/")[0] ?? "";
  if (topLevelDir) {
    const stripped = new Map<string, Buffer>();
    for (const [entryName, data] of allFiles) {
      const relative = entryName.startsWith(`${topLevelDir}/`) ? entryName.slice(topLevelDir.length + 1) : entryName;
      stripped.set(relative, data);
    }
    return stripped;
  }

  return allFiles;
}

export async function getBranchSha(client: { projectId: string; api: InstanceType<typeof Gitlab>; ref: string }): Promise<string> {
  const branch = (await retryOnTimeout(() =>
    client.api.Branches.show(client.projectId, client.ref),
  )) as { commit: { id: string } };
  return branch.commit.id;
}
