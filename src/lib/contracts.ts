import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

export function safeYamlLoad<T = unknown>(raw: string): T | null {
  const maxDepth = 50;
  let depth = 0;
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    if (indent >= 0) {
      const currentDepth = Math.floor(indent / 2);
      depth = Math.max(depth, currentDepth);
      if (depth > maxDepth) {
        console.warn(`[yaml] Exceeded max depth ${maxDepth}, rejecting`);
        return null;
      }
    }
  }
  return yaml.load(raw) as T | null;
}

import { Gitlab } from "@gitbeaker/rest";
import { hasGitLabConfig, getGitLabClient, downloadGitLabArchive, retryOnTimeout } from "@/src/lib/git-sync";
import type { CatalogCard, ContractFile, DataContract, EditorRepositoryFile } from "@/src/lib/types";

const contractsRoot = process.env.CONTRACTS_PATH ?? path.join(process.cwd(), "contracts");
const contractsCache: { expiresAt: number; value: ContractFile[]; commitSha: string } = { expiresAt: 0, value: [], commitSha: "" };
let pendingContractsPromise: Promise<ContractFile[]> | null = null;
const cardsCache: { expiresAt: number; value: CatalogCard[] } = { expiresAt: 0, value: [] };
const slugToPathCache: { expiresAt: number; map: Map<string, string> } = { expiresAt: 0, map: new Map() };
const CONTRACTS_CACHE_TTL_MS = 3_600_000;
const CARDS_CACHE_TTL_MS = 3_600_000;
const TREE_CACHE_TTL = 300_000;
const REPO_FOLDER_CACHE_TTL = 300_000;

const treeCache = new Map<string, { items: GitLabTreeItem[]; ts: number }>();
const repoFolderCache = new Map<string, { promise: Promise<RepositoryFolderFile[]>; ts: number }>();

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

const GITLAB_TREE_PAGE_SIZE = 100;

function hasGitLabContractsConfig() {
  return hasGitLabConfig();
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

async function readLocalTextFile(filePath: string): Promise<string | null> {
  const fullPath = path.join(process.cwd(), filePath);
  try {
    await fs.promises.access(fullPath);
    return await fs.promises.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }
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

let gitLabTreeError = false;
let gitLabContractsError = false;

export function hasGitLabTreeError(): boolean {
  return gitLabTreeError || gitLabContractsError;
}

export function resetGitLabTreeError(): void {
  gitLabTreeError = false;
  gitLabContractsError = false;
}

async function readGitLabTree(
  projectId: string,
  ref: string,
  folderPath: string
): Promise<GitLabTreeItem[]> {
  const now = Date.now();
  const cached = treeCache.get(folderPath);
  if (cached && now - cached.ts < TREE_CACHE_TTL) return cached.items;
  treeCache.delete(folderPath);

  const client = getGitLabClient();
  if (!client) {
    return [];
  }

  const items: GitLabTreeItem[] = [];
  let page = 1;

  try {
    while (true) {
      const batch = (await retryOnTimeout(() =>
        client.api.Repositories.allRepositoryTrees(
          projectId,
          {
            path: folderPath,
            recursive: true,
            ref,
            perPage: GITLAB_TREE_PAGE_SIZE,
            page
          } as never
        )
      )) as GitLabTreeItem[];

      items.push(...batch);

      if (batch.length < GITLAB_TREE_PAGE_SIZE) {
        break;
      }

      page += 1;
    }

    treeCache.set(folderPath, { items, ts: Date.now() });
  } catch (error) {
    console.error("[gitlab.tree] Failed", {
      projectId,
      ref,
      path: folderPath,
      ...toGitLabErrorMessage(error)
    });
    gitLabTreeError = true;
  }

  return items;
}

export async function getRepositoryTextFile(filePath: string, fallback = ""): Promise<string> {
  const gitContent = await readGitLabTextFile(filePath);
  if (gitContent !== null) {
    return gitContent;
  }

  const localContent = await readLocalTextFile(filePath);
  if (localContent !== null) {
    return localContent;
  }

  return fallback;
}

export async function getRepositoryFolderFiles(folderPath: string): Promise<RepositoryFolderFile[]> {
  const now = Date.now();
  const cached = repoFolderCache.get(folderPath);
  if (cached && now - cached.ts < REPO_FOLDER_CACHE_TTL) return cached.promise;
  repoFolderCache.delete(folderPath);

  const promise = getRepositoryFolderFilesUncached(folderPath);
  repoFolderCache.set(folderPath, { promise, ts: now });
  return promise;
}

async function getRepositoryFolderFilesUncached(folderPath: string): Promise<RepositoryFolderFile[]> {
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
  try {
    await fs.promises.access(localFolderPath);
  } catch {
    return [];
  }

  const localFiles = (await listRepositoryTextFiles(localFolderPath)).sort();

  return Promise.all(
    localFiles.map(async (fullPath) => {
      const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
      return {
        name: path.basename(fullPath),
        path: relativePath,
        content: await fs.promises.readFile(fullPath, "utf-8"),
        kind: getEditorFileKind(relativePath)
      } satisfies RepositoryFolderFile;
    })
  );
}

async function listYamlFiles(dir: string): Promise<string[]> {
  try {
    await fs.promises.access(dir);
  } catch {
    return [];
  }

  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listYamlFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function listRepositoryTextFiles(dir: string): Promise<string[]> {
  try {
    await fs.promises.access(dir);
  } catch {
    return [];
  }

  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRepositoryTextFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && /\.(yaml|yml|json|md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function getPathMaturity(filePath: string): string {
  const parts = filePath.split("/");
  // Supports: contracts/{maturity}/file.yaml  OR  contracts/published/{maturity}/file.yaml
  if (parts[1] === "published" && parts.length >= 4) return parts[2];
  if (parts[1] === "draft") return "";
  return parts[1] ?? path.basename(path.dirname(filePath));
}

async function buildContractsFromRecords(
  records: Array<{ path: string; fullPath: string; yamlRaw: string }>
): Promise<ContractFile[]> {
  const stemCount = new Map<string, number>();
  const slugCount = new Map<string, number>();
  const valid: Array<{ record: typeof records[number]; slug: string; data: DataContract }> = [];

  for (const record of records) {
    const stem = path.basename(record.path, path.extname(record.path));
    stemCount.set(stem, (stemCount.get(stem) ?? 0) + 1);
  }

  const CHUNK_SIZE = 50;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    for (const record of chunk) {
      const stem = path.basename(record.path, path.extname(record.path));
      const maturity = getPathMaturity(record.path);
      const isDuplicateStem = (stemCount.get(stem) ?? 0) > 1;
      const slug = isDuplicateStem ? `${maturity}-${stem}` : stem;
      let data: DataContract;
      try {
        data = safeYamlLoad<DataContract>(record.yamlRaw) ?? {};
      } catch {
        console.warn(`[contracts] Skipping malformed contract: ${record.path}`);
        continue;
      }

      slugCount.set(slug, (slugCount.get(slug) ?? 0) + 1);
      valid.push({ record, slug, data });
    }
    await yieldToEventLoop();
  }

  const contracts = valid.map(({ record, slug, data }) => {
    return { slug, stem: path.basename(record.path, path.extname(record.path)), maturity: getPathMaturity(record.path), fullPath: record.fullPath, yamlRaw: record.yamlRaw, data } satisfies ContractFile;
  });

  const seen = new Map<string, number>();

  return contracts.map((contract) => {
    const count = slugCount.get(contract.slug) ?? 1;
    if (count === 1) return contract;

    const idx = (seen.get(contract.slug) ?? 0) + 1;
    seen.set(contract.slug, idx);
    return idx === 1 ? contract : { ...contract, slug: `${contract.slug}-${idx}` };
  }).sort((left, right) => left.slug.localeCompare(right.slug));
}

async function readLocalContracts(): Promise<ContractFile[]> {
  const allFiles = (await listYamlFiles(contractsRoot)).sort();
  const records = await Promise.all(
    allFiles.map(async (fullPath) => ({
      path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/"),
      fullPath,
      yamlRaw: await fs.promises.readFile(fullPath, "utf-8")
    }))
  );

  return buildContractsFromRecords(records);
}

function getLocalContractCandidates(contract: ContractFile): string[] {
  const stem = path.basename(contract.fullPath, path.extname(contract.fullPath));
  const maturity = contract.maturity;
  return [
    contract.slug,
    contract.stem,
    stem,
    maturity ? `${maturity}-${stem}` : "",
  ].filter(Boolean);
}

export async function getLocalContracts(): Promise<ContractFile[]> {
  return readLocalContracts();
}

async function getGitLabContracts(client: {
  projectId: string;
  ref: string;
  api: InstanceType<typeof Gitlab>;
}): Promise<ContractFile[]> {
  console.info("[gitlab.contracts] Downloading archive");

  const archiveFiles = await downloadGitLabArchive(client);

  if (archiveFiles.size === 0) {
    throw new Error("GitLab archive download failed — check server logs");
  }

  const yamlPaths = [...archiveFiles.keys()].filter(
    (p) => /\.(yaml|yml)$/i.test(p) && p.startsWith("contracts/"),
  );

  console.info("[gitlab.contracts] Found YAML files in archive:", yamlPaths.length);

  const records: Array<{ path: string; fullPath: string; yamlRaw: string }> = [];

  for (const path of yamlPaths) {
    const buf = archiveFiles.get(path);
    if (!buf) continue;
    records.push({
      path,
      fullPath: path,
      yamlRaw: buf.toString("utf-8"),
    });
  }

  if (records.length === 0) {
    throw new Error("No YAML files extracted from GitLab archive");
  }

  const contracts = await buildContractsFromRecords(records);
  console.info("[gitlab.contracts] Parsed contracts:", contracts.length);

  return contracts;
}

function computeContractSlug(fullPath: string, stemCounts: Map<string, number>): string {
  const stem = path.basename(fullPath, path.extname(fullPath));
  const maturity = getPathMaturity(fullPath);
  const isDuplicateStem = (stemCounts.get(stem) ?? 0) > 1;
  return isDuplicateStem ? `${maturity}-${stem}` : stem;
}

function computeStemCounts(paths: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of paths) {
    const stem = path.basename(p, path.extname(p));
    counts.set(stem, (counts.get(stem) ?? 0) + 1);
  }
  return counts;
}

function populateSlugToPathCache(records: Array<{ fullPath: string }>) {
  const paths = records.map((r) => r.fullPath);
  const stemCounts = computeStemCounts(paths);
  for (const record of records) {
    const slug = computeContractSlug(record.fullPath, stemCounts);
    slugToPathCache.map.set(slug, record.fullPath);
  }
  slugToPathCache.expiresAt = Date.now() + CONTRACTS_CACHE_TTL_MS;
}

async function buildSlugToPathMapFromTree(): Promise<Map<string, string>> {
  const client = getGitLabClient();
  if (!client) return new Map();

  const tree = await readGitLabTree(client.projectId, client.ref, "contracts");
  const yamlPaths = tree
    .filter((e) => e.type === "blob" && /^contracts\/.+\.(yaml|yml)$/i.test(e.path))
    .map((e) => e.path);

  const stemCounts = computeStemCounts(yamlPaths);
  const map = new Map<string, string>();
  for (const p of yamlPaths) {
    const slug = computeContractSlug(p, stemCounts);
    map.set(slug, p);
  }
  return map;
}

async function fetchSingleContractFile(fullPath: string): Promise<ContractFile | undefined> {
  const client = getGitLabClient();
  if (!client) return undefined;

  try {
    const file = (await client.api.RepositoryFiles.show(client.projectId, fullPath, client.ref)) as GitLabRepositoryFile;
    const rawContent = file.content ?? "";
    const yamlRaw = file.encoding === "base64" ? Buffer.from(rawContent, "base64").toString("utf-8") : rawContent;
    const record = { path: fullPath, fullPath, yamlRaw };
    const contracts = await buildContractsFromRecords([record]);
    return contracts[0];
  } catch {
    return undefined;
  }
}

async function getSingleContractFromGitLab(slug: string): Promise<ContractFile | undefined> {
  // Fast path: use cached slug→path mapping
  if (slugToPathCache.map.size > 0 && slugToPathCache.expiresAt > Date.now()) {
    const fullPath = slugToPathCache.map.get(slug);
    if (fullPath) return fetchSingleContractFile(fullPath);
  }

  // Try direct path guessing (common case: slug = filename stem)
  const candidates = [
    `contracts/${slug}.yaml`,
    `contracts/${slug}.yml`,
  ];
  for (const candidate of candidates) {
    const contract = await fetchSingleContractFile(candidate);
    if (contract && contract.slug === slug) return contract;
  }

  // Build mapping from tree listing (1 API call), then fetch only the target file
  const map = await buildSlugToPathMapFromTree();
  const fullPath = map.get(slug);
  if (fullPath) {
    slugToPathCache.map = map;
    slugToPathCache.expiresAt = Date.now() + CONTRACTS_CACHE_TTL_MS;
    return fetchSingleContractFile(fullPath);
  }

  return undefined;
}

export async function getContracts(): Promise<ContractFile[]> {
  const now = Date.now();

  if (pendingContractsPromise) {
    return pendingContractsPromise;
  }

  if (hasGitLabContractsConfig()) {
    const client = getGitLabClient();
    if (!client) return readLocalContracts();

    let latestSha = "";
    try {
      console.info("[gitlab.commit] Checking branch SHA", {
        projectId: client.projectId,
        ref: client.ref,
      });
      const branch = (await retryOnTimeout(() =>
        client.api.Branches.show(client.projectId, client.ref),
      )) as { commit: { id: string } };
      latestSha = branch.commit.id;
    } catch (error) {
      console.error("[gitlab.commit] Failed to get branch SHA", {
        message: error instanceof Error ? error.message : String(error),
      });
      if (contractsCache.value.length > 0 && contractsCache.expiresAt > now) {
        return contractsCache.value;
      }
    }

    if (
      latestSha &&
      contractsCache.value.length > 0 &&
      contractsCache.commitSha === latestSha &&
      contractsCache.expiresAt > now
    ) {
      return contractsCache.value;
    }

    try {
      pendingContractsPromise = getGitLabContracts(client);
      const contracts = await pendingContractsPromise;
      pendingContractsPromise = null;

    contractsCache.value = contracts;
    contractsCache.commitSha = latestSha;
    contractsCache.expiresAt = now + CONTRACTS_CACHE_TTL_MS;
    if (contracts.length > 0) {
      populateSlugToPathCache(contracts.map((c) => ({ fullPath: c.fullPath })));
    }
    return contracts;
    } catch (error) {
      pendingContractsPromise = null;
      gitLabContractsError = true;
      throw new Error(`Failed to fetch contracts from GitLab: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (contractsCache.value.length > 0 && contractsCache.expiresAt > now) {
    return contractsCache.value;
  }

  const contracts = await readLocalContracts();
  contractsCache.value = contracts;
  contractsCache.commitSha = "";
  contractsCache.expiresAt = now + CONTRACTS_CACHE_TTL_MS;
  if (contracts.length > 0) {
    populateSlugToPathCache(contracts.map((c) => ({ fullPath: c.fullPath })));
  }
  return contracts;
}

export async function getContractBySlug(slug: string): Promise<ContractFile | undefined> {
  let normalizedSlug = slug.trim();
  try {
    normalizedSlug = decodeURIComponent(slug).trim();
  } catch {
    normalizedSlug = slug.trim();
  }

  if (hasGitLabContractsConfig()) {
    const direct = await getSingleContractFromGitLab(normalizedSlug);
    if (direct) return direct;
  }

  const contracts = await getContracts();
  const contract = contracts.find((candidate) => candidate.slug === normalizedSlug);
  if (contract) return contract;

  // Fallback to local files only when GitLab is configured
  // (without GitLab, getContracts() already returns local contracts)
  if (hasGitLabContractsConfig()) {
    return (await readLocalContracts()).find((candidate) => getLocalContractCandidates(candidate).includes(normalizedSlug));
  }

  return undefined;
}

function getOwnerName(data: DataContract): string {
  const owners = data.asset?.owners;
  return owners?.business_owner?.name ?? owners?.technical_owner?.name ?? "";
}

export async function getCatalogCards(): Promise<CatalogCard[]> {
  const now = Date.now();
  if (cardsCache.value.length > 0 && cardsCache.expiresAt > now) {
    return cardsCache.value;
  }

  const contracts = await getContracts();
  const cards = contracts
    .map((contract) => {
      const asset = contract.data.asset ?? {};
      const title = contract.data.asset?.name ?? "Unknown";
      const version = contract.data.asset?.version ?? "N/A";
      const owner = getOwnerName(contract.data);
      const description = contract.data.asset?.description ?? "";
      const maturity = (asset.maturity ?? contract.maturity ?? "").toString().trim();
      const domain = (asset.domain ?? "").toString().trim();
      const context = (asset.context ?? "").toString().trim();
      return {
        slug: contract.slug,
        title,
        version,
        owner,
        description,
        maturity,
        domain,
        context,
        accessible: true,
        searchData: `${title} ${version} ${owner} ${description} ${maturity} ${domain} ${context} ${contract.fullPath}`.toLowerCase(),
        href: `/${contract.slug}`
      } satisfies CatalogCard;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  cardsCache.value = cards;
  cardsCache.expiresAt = now + CARDS_CACHE_TTL_MS;
  return cards;
}

export async function getDistinctScopes(): Promise<{ domain: string; context: string }[]> {
  const contracts = await getContracts();
  const seen = new Set<string>();
  const scopes: { domain: string; context: string }[] = [];

  for (const c of contracts) {
    const domain = (c.data.asset?.domain ?? "").toString().trim();
    const context = (c.data.asset?.context ?? "").toString().trim();
    if (!domain && !context) continue;
    const key = `${domain}||${context}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scopes.push({ domain, context });
  }

  return scopes.sort((a, b) => a.domain.localeCompare(b.domain) || a.context.localeCompare(b.context));
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
  fullPath: string;
} | null> {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return null;
  }

  return {
    slug: contract.slug,
    yamlRaw: contract.yamlRaw,
    data: contract.data,
    fullPath: contract.fullPath,
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
