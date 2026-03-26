import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { Gitlab } from "@gitbeaker/rest";

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

type CachedContracts = {
  key: string;
  items: ContractFile[];
  expiresAt: number;
};

let contractsCache: CachedContracts | null = null;
const CONTRACTS_CACHE_TTL_MS = 5_000;

function hasGitLabContractsConfig() {
  return Boolean(
    process.env.GITLAB_BASE_URL?.trim() && process.env.GITLAB_PROJECT_ID?.trim() && process.env.GITLAB_TOKEN?.trim()
  );
}

function getCacheKey() {
  return [
    process.env.GITLAB_BASE_URL?.trim() || "",
    process.env.GITLAB_PROJECT_ID?.trim() || "",
    process.env.GITLAB_REF?.trim() || "main"
  ].join("|");
}

function getGitLabClient() {
  const baseUrl = process.env.GITLAB_BASE_URL?.trim();
  const projectId = process.env.GITLAB_PROJECT_ID?.trim();
  const token = process.env.GITLAB_TOKEN?.trim();
  const ref = process.env.GITLAB_REF?.trim() || "main";

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

function listYamlFiles(dir: string): string[] {
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

  const tree = (await client.api.Repositories.allRepositoryTrees(client.projectId, {
    path: "contracts",
    recursive: true,
    ref: client.ref,
    perPage: 1000
  })) as GitLabTreeItem[];

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

  return buildContractsFromRecords(records);
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
        searchData: `${title} ${version} ${owner} ${description} ${maturity} ${domain}`.toLowerCase(),
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
  const root = process.cwd();
  const repoFiles: EditorRepositoryFile[] = [
    {
      id: "readme",
      name: "README.md",
      path: "README.md",
      kind: "markdown",
      content: fs.readFileSync(path.join(root, "README.md"), "utf-8")
    },
    {
      id: "schema-template",
      name: "template.v3.yaml",
      path: "schema/template.v3.yaml",
      kind: "yaml",
      content: fs.readFileSync(path.join(root, "schema", "template.v3.yaml"), "utf-8")
    },
    {
      id: "schema-contract",
      name: "contract_schema.json",
      path: "schema/contract_schema.json",
      kind: "json",
      content: fs.readFileSync(path.join(root, "schema", "contract_schema.json"), "utf-8")
    }
  ];

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
