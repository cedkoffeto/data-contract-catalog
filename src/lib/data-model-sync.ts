import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { DataModelContract, LoadedModel, ContractField } from "@/src/lib/data-model";
import { hasGitLabConfig, getGitLabClient, downloadGitLabArchive, getBranchSha } from "@/src/lib/git-sync";

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

function readLocalDataModel(): { contracts: DataModelContract[]; models: LoadedModel[] } {
  const DATA_MODEL_DIR = path.join(process.cwd(), "data-model");
  const CONTRACTS_DIR = path.join(process.cwd(), "contracts");

  function walk(dir: string): string[] {
    const files: string[] = [];
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) files.push(...walk(f));
        else if (e.name.endsWith(".yaml")) files.push(f);
      }
    } catch { /* ignore missing dir */ }
    return files;
  }

  const contractFiles = walk(CONTRACTS_DIR);
  const contracts: DataModelContract[] = [];

  for (const fp of contractFiles) {
    const raw = fs.readFileSync(fp, "utf-8");
    let doc: Record<string, unknown>;
    try { doc = yaml.load(raw) as Record<string, unknown>; } catch { continue; }
    const asset = doc?.asset as Record<string, unknown> | undefined;
    if (!asset) continue;

    const domain = ((asset.domain as string) || "").trim();
    const context = ((asset.context as string) || "").trim();
    const maturity = (asset.maturity as string) || path.basename(path.dirname(fp));
    const slug = path.basename(fp, ".yaml");

    const fields: ContractField[] = [];
    const schema = (doc.contract as Record<string, unknown>)?.schema as Record<string, unknown> | undefined;
    if (schema?.fields && Array.isArray(schema.fields)) {
      for (const f of schema.fields as Record<string, unknown>[]) {
        fields.push({
          name: (f.name as string) || "",
          type: (f.type as string) || "string",
          description: f.description as string | undefined,
        });
      }
    }

    contracts.push({ slug, maturity: maturity as "bronze" | "silver" | "gold", domain, context, name: (asset.name as string) || slug, fields });
  }

  const modelFiles = walk(DATA_MODEL_DIR).filter((f) => path.basename(f) !== "model-global.yaml");
  const models: LoadedModel[] = [];

  for (const fp of modelFiles) {
    const raw = fs.readFileSync(fp, "utf-8");
    let doc: Record<string, unknown>;
    try { doc = yaml.load(raw) as Record<string, unknown>; } catch { continue; }
    const domain = (doc.domain as string) || "";
    const context = (doc.context as string) || "";
    const layer = layerFromPath(fp);
    const rawRels = doc.relations;
    const relations: { ref_name: string; ref: string }[] = [];
    if (Array.isArray(rawRels)) {
      for (const r of rawRels as Record<string, unknown>[]) {
        relations.push({ ref_name: (r.ref_name as string) || "", ref: (r.ref as string) || "" });
      }
    }
    models.push({ domain, context, layer, sourceFile: path.basename(fp), relations });
  }

  return { contracts, models };
}

function parseContractsFromArchive(archiveFiles: Map<string, Buffer>): DataModelContract[] {
  const contracts: DataModelContract[] = [];
  const yamlPaths = [...archiveFiles.keys()].filter((p) => /\.(yaml|yml)$/i.test(p) && p.startsWith("contracts/"));

  for (const filePath of yamlPaths) {
    const buf = archiveFiles.get(filePath);
    if (!buf) continue;
    const raw = buf.toString("utf-8");
    let doc: Record<string, unknown>;
    try { doc = yaml.load(raw) as Record<string, unknown>; } catch { continue; }
    const asset = doc?.asset as Record<string, unknown> | undefined;
    if (!asset) continue;

    const domain = ((asset.domain as string) || "").trim();
    const context = ((asset.context as string) || "").trim();
    const maturity = (asset.maturity as string) || "bronze";
    const slug = path.basename(filePath, ".yaml");

    const fields: ContractField[] = [];
    const schema = (doc.contract as Record<string, unknown>)?.schema as Record<string, unknown> | undefined;
    if (schema?.fields && Array.isArray(schema.fields)) {
      for (const f of schema.fields as Record<string, unknown>[]) {
        fields.push({ name: (f.name as string) || "", type: (f.type as string) || "string", description: f.description as string | undefined });
      }
    }

    contracts.push({ slug, maturity: maturity as "bronze" | "silver" | "gold", domain, context, name: (asset.name as string) || slug, fields });
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
    const raw = buf.toString("utf-8");
    let doc: Record<string, unknown>;
    try { doc = yaml.load(raw) as Record<string, unknown>; } catch { continue; }
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
    models.push({ domain, context, layer, sourceFile: path.basename(filePath), relations });
  }

  return models;
}

export async function loadDataModel(): Promise<{ contracts: DataModelContract[]; models: LoadedModel[] }> {
  const now = Date.now();

  if (dataModelCache.expiresAt > now && dataModelCache.contracts.length > 0) {
    return { contracts: dataModelCache.contracts, models: dataModelCache.models };
  }

  if (!hasGitLabConfig()) {
    const local = readLocalDataModel();
    dataModelCache.contracts = local.contracts;
    dataModelCache.models = local.models;
    dataModelCache.commitSha = "";
    dataModelCache.expiresAt = now + DATA_MODEL_CACHE_TTL_MS;
    return local;
  }

  const client = getGitLabClient();
  if (!client) {
    const local = readLocalDataModel();
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
  }

  if (
    latestSha &&
    dataModelCache.commitSha === latestSha &&
    dataModelCache.expiresAt > now &&
    dataModelCache.contracts.length > 0
  ) {
    return { contracts: dataModelCache.contracts, models: dataModelCache.models };
  }

  const archiveFiles = await downloadGitLabArchive(client);
  const contracts = parseContractsFromArchive(archiveFiles);
  const models = parseModelsFromArchive(archiveFiles);

  dataModelCache.contracts = contracts;
  dataModelCache.models = models;
  dataModelCache.commitSha = latestSha;
  dataModelCache.expiresAt = now + DATA_MODEL_CACHE_TTL_MS;

  return { contracts, models };
}
