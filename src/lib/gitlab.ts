import path from "node:path";

import { Gitlab } from "@gitbeaker/rest";

import { getContractBySlug } from "@/src/lib/contracts";
import { getGitSourceRef } from "@/src/lib/git-source";
import type { ContractHistoryEntry } from "@/src/lib/types";

type GitLabCommitResponse = {
  id: string;
  short_id: string;
  title?: string;
  message?: string;
  authored_date?: string;
  created_at?: string;
  author_name?: string;
};

type GitLabCommitDiffResponse = {
  new_path: string;
  old_path: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
};

export function toPublicContractPath(filePath: string) {
  return filePath.replace(/^contracts\//, "");
}

class GitLabConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitLabConfigurationError";
  }
}

function toGitLabErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause as
      | {
          description?: string;
          request?: { url?: string; method?: string };
          response?: { status?: number; statusText?: string; url?: string };
        }
      | undefined;

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: cause
        ? {
            description: cause.description,
            request: cause.request
              ? {
                  method: cause.request.method,
                  url: cause.request.url
                }
              : undefined,
            response: cause.response
              ? {
                  status: cause.response.status,
                  statusText: cause.response.statusText,
                  url: cause.response.url
                }
              : undefined
          }
        : undefined
    };
  }

  return { value: error };
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new GitLabConfigurationError(`Missing environment variable: ${name}`);
  }

  return value;
}

function getGitLabConfig() {
  return {
    baseUrl: requireEnv("GITLAB_BASE_URL").replace(/\/$/, ""),
    projectId: requireEnv("GITLAB_PROJECT_ID"),
    token: requireEnv("GITLAB_TOKEN"),
    repositoryUrl: process.env.GITLAB_REPOSITORY_URL?.trim() || "",
    ref: getGitSourceRef()
  };
}

export function getGitLabClient() {
  const config = getGitLabConfig();

  return {
    api: new Gitlab({
      host: config.baseUrl,
      token: config.token
    }),
    config
  };
}

export function isGitLabConfigurationError(error: unknown) {
  return error instanceof GitLabConfigurationError;
}

export async function getGitLabContractFilePath(slug: string) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    throw new Error("Contract not found");
  }

  return contract.fullPath.replace(/\\/g, "/");
}

export async function getGitLabFileHistory(slug: string, limit = 10): Promise<ContractHistoryEntry[]> {
  const { api, config } = getGitLabClient();
  const filePath = await getGitLabContractFilePath(slug);

  console.info("[gitlab.history] Request", {
    slug,
    projectId: config.projectId,
    ref: config.ref,
    path: filePath,
    limit
  });

  try {
    const commits = (await api.Commits.all(config.projectId, {
      path: filePath,
      refName: config.ref,
      perPage: Math.max(limit, 20)
    })) as GitLabCommitResponse[];

    console.info("[gitlab.history] Success", {
      slug,
      projectId: config.projectId,
      ref: config.ref,
      path: filePath,
      count: commits.length
    });

    return commits.map((commit) => {
      const message = (commit.message ?? "").trim();
      const [rawTitle, ...rest] = message.split("\n");
      return {
        id: commit.id,
        shortId: commit.short_id,
        title: (commit.title ?? rawTitle ?? "Repository update").trim(),
        description: rest.join("\n").trim(),
        authoredDate: commit.authored_date ?? commit.created_at ?? "",
        authorName: (commit.author_name ?? "Repository").trim(),
        filePath: toPublicContractPath(filePath)
      };
    });
  } catch (error) {
    console.error("[gitlab.history] Failed", {
      slug,
      projectId: config.projectId,
      ref: config.ref,
      path: filePath,
      ...toGitLabErrorMessage(error)
    });
    throw error;
  }
}

async function readRepositoryFileAtRef(projectId: string, filePath: string, ref: string, api: InstanceType<typeof Gitlab>) {
  const response = await api.RepositoryFiles.show(projectId, filePath, ref);
  const content = response.content ?? "";
  return response.encoding === "base64" ? Buffer.from(content, "base64").toString("utf-8") : content;
}

async function resolveHistoricalFilePath(
  api: InstanceType<typeof Gitlab>,
  projectId: string,
  currentPath: string,
  ref: string
) {
  const diff = (await api.Commits.showDiff(projectId, ref, { perPage: 100 })) as GitLabCommitDiffResponse[];
  const currentName = path.basename(currentPath);
  const candidatePaths = new Set<string>();

  for (const entry of diff) {
    const touchesCurrentPath = entry.new_path === currentPath || entry.old_path === currentPath;
    const touchesCurrentName = path.basename(entry.new_path) === currentName || path.basename(entry.old_path) === currentName;

    if (!touchesCurrentPath && !touchesCurrentName) {
      continue;
    }

    if (entry.new_path) {
      candidatePaths.add(entry.new_path);
    }

    if (entry.old_path) {
      candidatePaths.add(entry.old_path);
    }
  }

  return Array.from(candidatePaths);
}

export async function getGitLabFileContent(slug: string, ref?: string) {
  const { api, config } = getGitLabClient();
  const filePath = await getGitLabContractFilePath(slug);
  const resolvedRef = ref || config.ref;

  console.info("[gitlab.content] Request", {
    slug,
    projectId: config.projectId,
    ref: resolvedRef,
    path: filePath
  });

  try {
    const decodedContent = await readRepositoryFileAtRef(config.projectId, filePath, resolvedRef, api);

    console.info("[gitlab.content] Success", {
      slug,
      projectId: config.projectId,
      ref: resolvedRef,
      path: filePath,
      size: decodedContent.length
    });

    return {
      filePath: toPublicContractPath(filePath),
      ref: resolvedRef,
      repositoryUrl: config.repositoryUrl,
      content: decodedContent
    };
  } catch (error) {
    if (ref) {
      try {
        const candidatePaths = await resolveHistoricalFilePath(api, config.projectId, filePath, resolvedRef);

        console.info("[gitlab.content] Historical path fallback", {
          slug,
          projectId: config.projectId,
          ref: resolvedRef,
          currentPath: filePath,
          candidatePaths
        });

        for (const candidatePath of candidatePaths) {
          try {
            const decodedContent = await readRepositoryFileAtRef(config.projectId, candidatePath, resolvedRef, api);

            console.info("[gitlab.content] Historical path success", {
              slug,
              projectId: config.projectId,
              ref: resolvedRef,
              path: candidatePath,
              size: decodedContent.length
            });

            return {
              filePath: toPublicContractPath(candidatePath),
              ref: resolvedRef,
              repositoryUrl: config.repositoryUrl,
              content: decodedContent
            };
          } catch {
            // Try next candidate.
          }
        }
      } catch (fallbackError) {
        console.error("[gitlab.content] Historical path resolution failed", {
          slug,
          projectId: config.projectId,
          ref: resolvedRef,
          path: filePath,
          ...toGitLabErrorMessage(fallbackError)
        });
      }
    }

    console.error("[gitlab.content] Failed", {
      slug,
      projectId: config.projectId,
      ref: resolvedRef,
      path: filePath,
      ...toGitLabErrorMessage(error)
    });
    throw error;
  }
}
