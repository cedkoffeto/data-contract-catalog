import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { CatalogCard, ContractFile, DataContract, EditorRepositoryFile } from "@/src/lib/types";

const contractsRoot = path.join(process.cwd(), "contracts");

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

function readContracts(): ContractFile[] {
  const allFiles = listYamlFiles(contractsRoot).sort();
  const stemCount = new Map<string, number>();

  for (const fullPath of allFiles) {
    const stem = path.basename(fullPath, path.extname(fullPath));
    stemCount.set(stem, (stemCount.get(stem) ?? 0) + 1);
  }

  const contracts: ContractFile[] = [];
  for (const fullPath of allFiles) {
    const stem = path.basename(fullPath, path.extname(fullPath));
    const maturity = path.basename(path.dirname(fullPath));
    const isDuplicateStem = (stemCount.get(stem) ?? 0) > 1;
    const slug = isDuplicateStem ? `${maturity}-${stem}` : stem;
    const yamlRaw = fs.readFileSync(fullPath, "utf-8");
    const data = (yaml.load(yamlRaw) as DataContract) ?? {};

    contracts.push({
      slug,
      stem,
      maturity,
      fullPath,
      yamlRaw,
      data
    });
  }

  return contracts;
}

let cache: ContractFile[] | null = null;

export function getContracts(): ContractFile[] {
  if (cache) {
    return cache;
  }
  cache = readContracts();
  return cache;
}

export function getContractBySlug(slug: string): ContractFile | undefined {
  return getContracts().find((contract) => contract.slug === slug);
}

function getOwnerName(data: DataContract): string {
  const owners = data.asset?.owners;
  return owners?.business_owner?.name ?? owners?.technical_owner?.name ?? "";
}

export function getCatalogCards(): CatalogCard[] {
  return getContracts()
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

export function searchCatalogCards({
  q = "",
  domain = "",
  maturity = ""
}: {
  q?: string;
  domain?: string;
  maturity?: string;
}): CatalogCard[] {
  const normalizedQuery = q.trim().toLowerCase();
  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedMaturity = maturity.trim().toLowerCase();

  return getCatalogCards().filter((card) => {
    const matchesQuery = !normalizedQuery || card.searchData.includes(normalizedQuery);
    const matchesDomain = !normalizedDomain || card.domain.trim().toLowerCase() === normalizedDomain;
    const matchesMaturity = !normalizedMaturity || card.maturity.trim().toLowerCase() === normalizedMaturity;

    return matchesQuery && matchesDomain && matchesMaturity;
  });
}

export function getContractPageData(slug: string): {
  slug: string;
  yamlRaw: string;
  data: DataContract;
} | null {
  const contract = getContractBySlug(slug);
  if (!contract) {
    return null;
  }

  return {
    slug: contract.slug,
    yamlRaw: contract.yamlRaw,
    data: contract.data
  };
}

export function getEditorRepositoryFiles(): EditorRepositoryFile[] {
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

  const contractFiles = getContracts().map((contract) => ({
    id: contract.slug,
    name: path.basename(contract.fullPath),
    path: path.relative(root, contract.fullPath),
    kind: "contract" as const,
    content: contract.yamlRaw,
    contractSlug: contract.slug,
    maturity: contract.maturity,
    data: contract.data
  }));

  return [...repoFiles, ...contractFiles];
}
