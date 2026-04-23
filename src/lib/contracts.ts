import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { Gitlab } from "@gitbeaker/rest";

import { getGitSourceRef } from "@/src/lib/git-source";
import type { CatalogCard, ContractFile, DataContract, EditorRepositoryFile } from "@/src/lib/types";

const contractsRoot = path.join(process.cwd(), "contracts");

type GitLabTreeItem = {
  id?: string;
  name: string;
  path: string;
  type: "tree" | "blob";
};

type GitLabRepositoryFile = {
  content?: string;
  encoding?: string;
  file_path?: string;
};

type RepositoryFolderFile = {
  name: string;
  path: string;
  content: string;
  kind: EditorRepositoryFile["kind"];
};

type CachedContracts = {
  key: string;
  items: ContractFile[];
  expiresAt: number;
};

let contractsCache: CachedContracts | null = null;
const CONTRACTS_CACHE_TTL_MS = 5_000;
const GITLAB_TREE_PAGE_SIZE = 1000;

function hasGitLabContractsConfig() {
  return Boolean(
    process.env.GITLAB_BASE_URL?.trim() && process.env.GITLAB_PROJECT_ID?.trim() && process.env.GITLAB_TOKEN?.trim()
  );
}

function getCacheKey() {
  return [
    process.env.GITLAB_BASE_URL?.trim() || "",
    process.env.GITLAB_PROJECT_ID?.trim() || "",
    getGitSourceRef()
  ].join("|");
}

function getGitLabClient() {
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
      token
    }),
    projectId,
    ref
  };
}

function toGitLabErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause =
      error.cause && typeof error.cause === "object"
        ? {
            description:
              "description" in error.cause && typeof error.cause.description === "string"
                ? error.cause.description
                : undefined,
            request:
              "request" in error.cause && error.cause.request && typeof error.cause.request === "object"
                ? {
                    method:
                      "method" in error.cause.request && typeof error.cause.request.method === "string"
                        ? error.cause.request.method
                        : undefined,
                    url:
                      "url" in error.cause.request && typeof error.cause.request.url === "string"
                        ? error.cause.request.url
                        : undefined
                  }
                : undefined,
            response:
              "response" in error.cause && error.cause.response && typeof error.cause.response === "object"
                ? {
                    status:
                      "status" in error.cause.response && typeof error.cause.response.status === "number"
                        ? error.cause.response.status
                        : undefined,
                    statusText:
                      "statusText" in error.cause.response && typeof error.cause.response.statusText === "string"
                        ? error.cause.response.statusText
                        : undefined,
                    url:
                      "url" in error.cause.response && typeof error.cause.response.url === "string"
                        ? error.cause.response.url
                        : undefined
                  }
                : undefined
          }
        : error.cause;

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause
    };
  }

  return { value: error };
}

async function readGitLabTextFile(filePath: string): Promise<string | null> {
  const client = getGitLabClient();
  if (!client) {
    return null;
  }

  try {
    console.info("[gitlab.file] Request", {
      projectId: client.projectId,
      ref: client.ref,
      path: filePath
    });
    const file = (await client.api.RepositoryFiles.show(client.projectId, filePath, client.ref)) as GitLabRepositoryFile;
    const rawContent = file.content ?? "";
    const content = file.encoding === "base64" ? Buffer.from(rawContent, "base64").toString("utf-8") : rawContent;
    console.info("[gitlab.file] Success", {
      projectId: client.projectId,
      ref: client.ref,
      path: filePath,
      size: content.length
    });
    return content;
  } catch (error) {
    console.error("[gitlab.file] Failed", {
      projectId: client.projectId,
      ref: client.ref,
      path: filePath,
      ...toGitLabErrorMessage(error)
    });
    return null;
  }
}

function readLocalTextFile(filePath: string): string | null {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fs.readFileSync(fullPath, "utf-8");
}

function getEditorFileKind(filePath: string): EditorRepositoryFile["kind"] {
  if (/\.(md|mdx)$/i.test(filePath)) {
    return "markdown";
  }

  if (/\.json$/i.test(filePath)) {
    return "json";
  }

  return "yaml";
}

async function readGitLabTree(
  projectId: string,
  ref: string,
  folderPath: string
): Promise<GitLabTreeItem[]> {
  const client = getGitLabClient();
  if (!client) {
    return [];
  }

  const items: GitLabTreeItem[] = [];
  let page = 1;

  while (true) {
    const batch = (await client.api.Repositories.allRepositoryTrees(
      projectId,
      {
        path: folderPath,
        recursive: true,
        ref,
        perPage: GITLAB_TREE_PAGE_SIZE,
        page
      } as never
    )) as GitLabTreeItem[];

    items.push(...batch);

    if (batch.length < GITLAB_TREE_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return items;
}

export async function getRepositoryTextFile(filePath: string, fallback = ""): Promise<string> {
  const gitContent = await readGitLabTextFile(filePath);
  if (gitContent !== null) {
    return gitContent;
  }

  const localContent = readLocalTextFile(filePath);
  if (localContent !== null) {
    return localContent;
  }

  return fallback;
}

export async function getRepositoryFolderFiles(folderPath: string): Promise<RepositoryFolderFile[]> {
  const client = getGitLabClient();

  if (client) {
    try {
      console.info("[gitlab.tree] Request", {
        projectId: client.projectId,
        ref: client.ref,
        path: folderPath
      });
      const tree = await readGitLabTree(client.projectId, client.ref, folderPath);
      console.info("[gitlab.tree] Success", {
        projectId: client.projectId,
        ref: client.ref,
        path: folderPath,
        count: tree.length
      });

      const files = tree.filter((entry) => entry.type === "blob");
      const records = await Promise.all(
        files.map(async (entry) => {
          const content = await getRepositoryTextFile(entry.path, "");
          return {
            name: entry.name,
            path: entry.path,
            content,
            kind: getEditorFileKind(entry.path)
          } satisfies RepositoryFolderFile;
        })
      );

      if (records.length > 0) {
        return records.sort((left, right) => left.path.localeCompare(right.path));
      }
    } catch (error) {
      console.error("[gitlab.tree] Failed", {
        projectId: client.projectId,
        ref: client.ref,
        path: folderPath,
        ...toGitLabErrorMessage(error)
      });
      // Fall through to local folder lookup.
    }
  }

  const localFolderPath = path.join(process.cwd(), folderPath);
  if (!fs.existsSync(localFolderPath)) {
    return [];
  }

  const localFiles = listRepositoryTextFiles(localFolderPath).sort();

  return localFiles.map((fullPath) => {
    const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
    return {
      name: path.basename(fullPath),
      path: relativePath,
      content: fs.readFileSync(fullPath, "utf-8"),
      kind: getEditorFileKind(relativePath)
    } satisfies RepositoryFolderFile;
  });
}

function listYamlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listYamlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))) {
      files.push(fullPath);
    }
  }

  return files;
}

function listRepositoryTextFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRepositoryTextFiles(fullPath));
      continue;
    }
    if (entry.isFile() && /\.(yaml|yml|json|md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function buildContractsFromRecords(
  records: Array<{ path: string; fullPath: string; yamlRaw: string }>
): ContractFile[] {
  const stemCount = new Map<string, number>();

  for (const record of records) {
    const stem = path.basename(record.path, path.extname(record.path));
    stemCount.set(stem, (stemCount.get(stem) ?? 0) + 1);
  }

  return records
    .map((record) => {
      const stem = path.basename(record.path, path.extname(record.path));
      const maturity = record.path.split("/")[1] ?? path.basename(path.dirname(record.path));
      const isDuplicateStem = (stemCount.get(stem) ?? 0) > 1;
      const slug = isDuplicateStem ? `${maturity}-${stem}` : stem;
      const data = (yaml.load(record.yamlRaw) as DataContract) ?? {};

      return {
        slug,
        stem,
        maturity,
        fullPath: record.fullPath,
        yamlRaw: record.yamlRaw,
        data
      } satisfies ContractFile;
    })
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

function readLocalContracts(): ContractFile[] {
  const allFiles = listYamlFiles(contractsRoot).sort();
  const records = allFiles.map((fullPath) => ({
    path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/"),
    fullPath,
    yamlRaw: fs.readFileSync(fullPath, "utf-8")
  }));

  return buildContractsFromRecords(records);
}

async function readGitLabContracts(): Promise<ContractFile[]> {
  const client = getGitLabClient();
  if (!client) {
    return readLocalContracts();
  }

  console.info("[gitlab.contracts] Request", {
    projectId: client.projectId,
    ref: client.ref,
    path: "contracts"
  });

  const tree = await readGitLabTree(client.projectId, client.ref, "contracts");
  console.info("[gitlab.contracts] Tree success", {
    projectId: client.projectId,
    ref: client.ref,
    count: tree.length
  });

  const yamlEntries = tree.filter(
    (entry) => entry.type === "blob" && /^contracts\/.+\.(yaml|yml)$/i.test(entry.path)
  );

  const records = await Promise.all(
    yamlEntries.map(async (entry) => {
      const file = (await client.api.RepositoryFiles.show(client.projectId, entry.path, client.ref)) as GitLabRepositoryFile;
      const rawContent = file.content ?? "";
      const yamlRaw = file.encoding === "base64" ? Buffer.from(rawContent, "base64").toString("utf-8") : rawContent;

      return {
        path: entry.path,
        fullPath: entry.path,
        yamlRaw
      };
    })
  );

  const contracts = buildContractsFromRecords(records);
  console.info("[gitlab.contracts] Parsed contracts", {
    projectId: client.projectId,
    ref: client.ref,
    count: contracts.length
  });

  return contracts;
}

export async function getContracts(): Promise<ContractFile[]> {
  const cacheKey = getCacheKey();
  const now = Date.now();

  if (contractsCache && contractsCache.key === cacheKey && contractsCache.expiresAt > now) {
    return contractsCache.items;
  }

  const items = hasGitLabContractsConfig() ? await readGitLabContracts() : readLocalContracts();
  contractsCache = {
    key: cacheKey,
    items,
    expiresAt: now + CONTRACTS_CACHE_TTL_MS
  };

  return items;
}

export async function getContractBySlug(slug: string): Promise<ContractFile | undefined> {
  const contracts = await getContracts();
  return contracts.find((contract) => contract.slug === slug);
}

function getOwnerName(data: DataContract): string {
  const owners = data.asset?.owners;
  return owners?.business_owner?.name ?? owners?.technical_owner?.name ?? "";
}

export async function getCatalogCards(): Promise<CatalogCard[]> {
  const contracts = await getContracts();

  return contracts
    .map((contract) => {
      const asset = contract.data.asset ?? {};
      const title = contract.data.asset?.name ?? "Unknown";
      const version = contract.data.asset?.version ?? "N/A";
      const owner = getOwnerName(contract.data);
      const description = contract.data.asset?.description ?? "";
      const maturity = (asset.maturity ?? contract.maturity ?? "").toString().trim();
      const domain = (asset.domain ?? "").toString().trim();
      return {
        slug: contract.slug,
        title,
        version,
        owner,
        description,
        maturity,
        domain,
        searchData: `${title} ${version} ${owner} ${description} ${maturity} ${domain} ${contract.fullPath} ${contract.yamlRaw}`.toLowerCase(),
        href: `/${contract.slug}`
      } satisfies CatalogCard;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function searchCatalogCards({
  q = "",
  domain = "",
  maturity = ""
}: {
  q?: string;
  domain?: string;
  maturity?: string;
}): Promise<CatalogCard[]> {
  const normalizedQuery = q.trim().toLowerCase();
  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedMaturity = maturity.trim().toLowerCase();
  const cards = await getCatalogCards();

  return cards.filter((card) => {
    const matchesQuery = !normalizedQuery || card.searchData.includes(normalizedQuery);
    const matchesDomain = !normalizedDomain || card.domain.trim().toLowerCase() === normalizedDomain;
    const matchesMaturity = !normalizedMaturity || card.maturity.trim().toLowerCase() === normalizedMaturity;

    return matchesQuery && matchesDomain && matchesMaturity;
  });
}

export async function getContractPageData(slug: string): Promise<{
  slug: string;
  yamlRaw: string;
  data: DataContract;
} | null> {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return null;
  }

  return {
    slug: contract.slug,
    yamlRaw: contract.yamlRaw,
    data: contract.data
  };
}

export async function getEditorRepositoryFiles(): Promise<EditorRepositoryFile[]> {
  const schemaFiles = await getRepositoryFolderFiles("schema");
  const docsFiles = await getRepositoryFolderFiles("docs");
  const repoFiles: EditorRepositoryFile[] = [...schemaFiles, ...docsFiles].map((file) => ({
    id: file.path.replace(/[/.]/g, "-"),
    name: file.name,
    path: file.path,
    kind: file.kind,
    content: file.content
  }));

  const contracts = await getContracts();
  const contractFiles = contracts.map((contract) => ({
    id: contract.slug,
    name: path.basename(contract.fullPath),
    path: contract.fullPath,
    kind: "contract" as const,
    content: contract.yamlRaw,
    contractSlug: contract.slug,
    maturity: contract.maturity,
    data: contract.data
  }));

  return [...repoFiles, ...contractFiles];
}
