import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { DataModelContract, LoadedModel, ContractField } from "@/src/lib/data-model";
import { hasGitLabConfig, getGitLabClient, downloadGitLabArchive, getBranchSha } from "@/src/lib/git-sync";

const YAML_MAX_DEPTH = 50;

function safeYamlLoad<T = unknown>(raw: string): T | null {
  let depth = 0;
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);
    if (indent >= 0) {
      const currentDepth = Math.floor(indent / 2);
      depth = Math.max(depth, currentDepth);
      if (depth > YAML_MAX_DEPTH) return null;
    }
  }
  return yaml.load(raw) as T | null;
}

const DATA_MODEL_CACHE_TTL_MS = 3_600_000;
const dataModelCache: {
  expiresAt: number;
  contracts: DataModelContract[];
  models: LoadedModel[];
  commitSha: string;
} = { expiresAt: 0, contracts: [], models: [], commitSha: "" };

function layerFromPath(fp: string): string {
  const parts = fp.replace(/\\/g, "/").split("/");
  const idx = parts.indexOf("data-model");
  if (idx !== -1 && idx + 1 < parts.length) return parts[idx + 1];
  return "bronze";
}

function getMaturityFromContractPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const idx = parts.indexOf("contracts");
  if (idx === -1) return "bronze";
  // contracts/published/{maturity}/file.yaml
  if (parts[idx + 1] === "published" && idx + 2 < parts.length) return parts[idx + 2];
  // contracts/{maturity}/file.yaml
  return parts[idx + 1] ?? "bronze";
}

function parseContractFromRaw(
  raw: string,
  slug: string,
  defaultMaturity: string,
): DataModelContract | null {
  let doc: Record<string, unknown>;
  try { const parsed = safeYamlLoad<Record<string, unknown>>(raw); if (!parsed) return null; doc = parsed; } catch { return null; }
  const asset = doc?.asset as Record<string, unknown> | undefined;
  if (!asset) return null;

  const domain = ((asset.domain as string) || "").trim();
  const context = ((asset.context as string) || "").trim();
  const maturity = (asset.maturity as string) || defaultMaturity;

  const fields: ContractField[] = [];
  const relations: { ref_name: string; ref: string }[] = [];
  const schema = (doc.contract as Record<string, unknown>)?.schema as Record<string, unknown> | undefined;
  if (schema?.fields && Array.isArray(schema.fields)) {
    for (const f of schema.fields as Record<string, unknown>[]) {
      fields.push({
        name: (f.name as string) || "",
        type: (f.type as string) || "string",
        description: f.description as string | undefined,
      });
      const fieldRels = f.relations;
      if (Array.isArray(fieldRels)) {
        for (const r of fieldRels as Record<string, unknown>[]) {
          relations.push({ ref_name: (r.ref_name as string) || "", ref: (r.ref as string) || "" });
        }
      }
    }
  }

  const rawRels = schema?.relations ?? doc.relations;
  if (Array.isArray(rawRels)) {
    for (const r of rawRels as Record<string, unknown>[]) {
      relations.push({ ref_name: (r.ref_name as string) || "", ref: (r.ref as string) || "" });
    }
  }

  return {
    slug,
    maturity: maturity as "bronze" | "silver" | "gold",
    domain,
    context,
    name: (asset.name as string) || slug,
    description: asset.description as string | undefined,
    fields,
    relations: relations.length > 0 ? relations : undefined,
  };
}

function parseModelFromRaw(raw: string, filePath: string): LoadedModel | null {
  let doc: Record<string, unknown>;
  try { const parsed = safeYamlLoad<Record<string, unknown>>(raw); if (!parsed) return null; doc = parsed; } catch { return null; }
  const domain = (doc.domain as string) || "";
  const context = (doc.context as string) || "";
  const layer = layerFromPath(filePath);
  const rawRels = doc.relations;
  const relations: { ref_name: string; ref: string }[] = [];
  if (Array.isArray(rawRels)) {
    for (const r of rawRels as Record<string, unknown>[]) {
      relations.push({ ref_name: (r.ref_name as string) || "", ref: (r.ref as string) || "" });
    }
  }
  return { domain, context, layer, sourceFile: path.basename(filePath), relations };
}

async function readLocalDataModel(): Promise<{ contracts: DataModelContract[]; models: LoadedModel[] }> {
  const DATA_MODEL_DIR = path.join(process.cwd(), "data-model");
  const CONTRACTS_DIR = path.join(process.cwd(), "contracts");

  async function walk(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
      for (const e of await fs.promises.readdir(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) files.push(...(await walk(f)));
        else if (e.name.endsWith(".yaml")) files.push(f);
      }
    } catch { /* ignore missing dir */ }
    return files;
  }

  const [contractPaths, modelPaths] = await Promise.all([
    walk(CONTRACTS_DIR).then((paths) => paths.filter((fp) => !fp.includes("/draft/"))),
    walk(DATA_MODEL_DIR).then((paths) => paths.filter((f) => path.basename(f) !== "model-global.yaml")),
  ]);

  const [contracts, models] = await Promise.all([
    Promise.all(
      contractPaths.map(async (fp) => {
        const raw = await fs.promises.readFile(fp, "utf-8");
        const slug = path.basename(fp, ".yaml");
        const maturity = getMaturityFromContractPath(fp);
        return parseContractFromRaw(raw, slug, maturity);
      })
    ).then((results) => results.filter(Boolean) as DataModelContract[]),
    Promise.all(
      modelPaths.map(async (fp) => {
        const raw = await fs.promises.readFile(fp, "utf-8");
        return parseModelFromRaw(raw, fp);
      })
    ).then((results) => results.filter(Boolean) as LoadedModel[]),
  ]);

  return { contracts, models };
}

function parseContractsFromArchive(archiveFiles: Map<string, Buffer>): DataModelContract[] {
  const contracts: DataModelContract[] = [];
  const yamlPaths = [...archiveFiles.keys()].filter(
    (p) => /\.(yaml|yml)$/i.test(p) && p.startsWith("contracts/") && !p.includes("/draft/"),
  );

  for (const filePath of yamlPaths) {
    const buf = archiveFiles.get(filePath);
    if (!buf) continue;
    const slug = path.basename(filePath, ".yaml");
    const maturity = getMaturityFromContractPath(filePath);
    const parsed = parseContractFromRaw(buf.toString("utf-8"), slug, maturity);
    if (parsed) contracts.push(parsed);
  }

  return contracts;
}

function parseModelsFromArchive(archiveFiles: Map<string, Buffer>): LoadedModel[] {
  const models: LoadedModel[] = [];
  const yamlPaths = [...archiveFiles.keys()].filter(
    (p) => /\.(yaml|yml)$/i.test(p) && p.startsWith("data-model/") && !p.endsWith("model-global.yaml"),
  );

  for (const filePath of yamlPaths) {
    const buf = archiveFiles.get(filePath);
    if (!buf) continue;
    const parsed = parseModelFromRaw(buf.toString("utf-8"), filePath);
    if (parsed) models.push(parsed);
  }

  return models;
}

export async function loadDataModel(): Promise<{ contracts: DataModelContract[]; models: LoadedModel[] }> {
  const now = Date.now();

  if (!hasGitLabConfig()) {
    if (dataModelCache.expiresAt > now && dataModelCache.contracts.length > 0) {
      return { contracts: dataModelCache.contracts, models: dataModelCache.models };
    }
    const local = await readLocalDataModel();
    dataModelCache.contracts = local.contracts;
    dataModelCache.models = local.models;
    dataModelCache.commitSha = "";
    dataModelCache.expiresAt = now + DATA_MODEL_CACHE_TTL_MS;
    return local;
  }

  const client = getGitLabClient();
  if (!client) {
    if (dataModelCache.expiresAt > now && dataModelCache.contracts.length > 0) {
      return { contracts: dataModelCache.contracts, models: dataModelCache.models };
    }
    const local = await readLocalDataModel();
    dataModelCache.contracts = local.contracts;
    dataModelCache.models = local.models;
    dataModelCache.expiresAt = now + DATA_MODEL_CACHE_TTL_MS;
    return local;
  }

  let latestSha = "";
  try {
    latestSha = await getBranchSha(client);
  } catch {
    if (dataModelCache.contracts.length > 0 && dataModelCache.expiresAt > now) {
      return { contracts: dataModelCache.contracts, models: dataModelCache.models };
    }
    const local = await readLocalDataModel();
    dataModelCache.contracts = local.contracts;
    dataModelCache.models = local.models;
    dataModelCache.expiresAt = now + DATA_MODEL_CACHE_TTL_MS;
    return local;
  }

  if (
    latestSha &&
    dataModelCache.commitSha === latestSha &&
    dataModelCache.expiresAt > now &&
    dataModelCache.contracts.length > 0
  ) {
    return { contracts: dataModelCache.contracts, models: dataModelCache.models };
  }

  dataModelCache.commitSha = "";
  dataModelCache.expiresAt = 0;

  const archiveFiles = await downloadGitLabArchive(client);
  const contracts = parseContractsFromArchive(archiveFiles);
  const models = parseModelsFromArchive(archiveFiles);

  dataModelCache.contracts = contracts;
  dataModelCache.models = models;
  dataModelCache.commitSha = latestSha;
  dataModelCache.expiresAt = now + DATA_MODEL_CACHE_TTL_MS;

  return { contracts, models };
}
