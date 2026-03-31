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
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
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

function getGitLabClient() {
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
      perPage: Math.max(limit, 50)
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
    const response = await api.RepositoryFiles.show(config.projectId, filePath, resolvedRef);
    const content = response.content ?? "";
    const decodedContent =
      response.encoding === "base64" ? Buffer.from(content, "base64").toString("utf-8") : content;

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
