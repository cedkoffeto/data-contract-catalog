import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { Gitlab } from "@gitbeaker/rest";

import { getGitSourceRef } from "@/src/lib/git-source";
import type { CatalogCard, ContractFile, DataContract, EditorRepositoryFile } from "@/src/lib/types";

const contractsRoot = process.env.CONTRACTS_PATH ?? path.join(process.cwd(), "contracts");
const contractsCache: { expiresAt: number; value: ContractFile[] } = { expiresAt: 0, value: [] };
const cardsCache: { expiresAt: number; value: CatalogCard[] } = { expiresAt: 0, value: [] };
const slugToPathCache: { expiresAt: number; map: Map<string, string> } = { expiresAt: 0, map: new Map() };
const CONTRACTS_CACHE_TTL_MS = 3_600_000;
const CARDS_CACHE_TTL_MS = 3_600_000;

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

const GITLAB_TREE_PAGE_SIZE = 1000;

function hasGitLabContractsConfig() {
  return Boolean(
    process.env.GITLAB_BASE_URL?.trim() && process.env.GITLAB_PROJECT_ID?.trim() && process.env.GITLAB_TOKEN?.trim()
  );
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

const RETRY_MAX = 2;
const RETRY_DELAY_MS = 1500;

async function retryOnTimeout<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < RETRY_MAX && error instanceof TypeError && (error as Error).message === "fetch failed") {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      throw error;
    }
  }
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
  } catch (error) {
    console.error("[gitlab.tree] Failed", {
      projectId,
      ref,
      path: folderPath,
      ...toGitLabErrorMessage(error)
    });
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

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
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
      const maturity = record.path.split("/")[1] ?? path.basename(path.dirname(record.path));
      const isDuplicateStem = (stemCount.get(stem) ?? 0) > 1;
      const slug = isDuplicateStem ? `${maturity}-${stem}` : stem;
      let data: DataContract;
      try {
        data = (yaml.load(record.yamlRaw) as DataContract) ?? {};
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
    return { slug, stem: path.basename(record.path, path.extname(record.path)), maturity: record.path.split("/")[1] ?? path.basename(path.dirname(record.path)), fullPath: record.fullPath, yamlRaw: record.yamlRaw, data } satisfies ContractFile;
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
  const allFiles = listYamlFiles(contractsRoot).sort();
  const records = allFiles.map((fullPath) => ({
    path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/"),
    fullPath,
    yamlRaw: fs.readFileSync(fullPath, "utf-8")
  }));

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

async function getGitLabContracts(): Promise<ContractFile[]> {
  const client = getGitLabClient();
  if (!client) {
    return readLocalContracts();
  }

  console.info("[gitlab.contracts] Fetching tree", {
    projectId: client.projectId,
    ref: client.ref,
  });

  const tree = await readGitLabTree(client.projectId, client.ref, "contracts");

  if (tree.length === 0) {
    console.warn("[gitlab.contracts] Tree empty, falling back to local contracts");
    return readLocalContracts();
  }

  const yamlEntries = tree.filter(
    (entry) => entry.type === "blob" && /\.(yaml|yml)$/i.test(entry.path),
  );

  console.info("[gitlab.contracts] YAML files to fetch:", yamlEntries.length);

  const records: Array<{ path: string; fullPath: string; yamlRaw: string }> = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < yamlEntries.length; i += BATCH_SIZE) {
    const batch = yamlEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        const file = (await client.api.RepositoryFiles.show(
          client.projectId,
          entry.path,
          client.ref,
        )) as GitLabRepositoryFile;
        const rawContent = file.content ?? "";
        const yamlRaw =
          file.encoding === "base64"
            ? Buffer.from(rawContent, "base64").toString("utf-8")
            : rawContent;
        return { path: entry.path, fullPath: entry.path, yamlRaw };
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled") records.push(r.value);
    }
  }

  console.info("[gitlab.contracts] Fetched files:", records.length);

  if (records.length === 0) {
    console.warn("[gitlab.contracts] All file fetches failed, falling back to local contracts");
    return readLocalContracts();
  }

  const contracts = await buildContractsFromRecords(records);
  console.info("[gitlab.contracts] Parsed contracts", {
    projectId: client.projectId,
    ref: client.ref,
    count: contracts.length,
  });

  return contracts;
}

function computeContractSlug(fullPath: string, stemCounts: Map<string, number>): string {
  const stem = path.basename(fullPath, path.extname(fullPath));
  const maturity = fullPath.split("/")[1] ?? path.basename(path.dirname(fullPath));
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
  if (contractsCache.value.length > 0 && contractsCache.expiresAt > now) {
    return contractsCache.value;
  }

  const contracts = hasGitLabContractsConfig() ? await getGitLabContracts() : await readLocalContracts();
  contractsCache.value = contracts;
  contractsCache.expiresAt = Date.now() + CONTRACTS_CACHE_TTL_MS;
  // Also warm slug→path mapping from the fetched contracts
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

  return (await readLocalContracts()).find((candidate) => getLocalContractCandidates(candidate).includes(normalizedSlug));
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
