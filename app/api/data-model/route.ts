import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

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

function layerFromPath(fp: string): string {
  const parts = fp.replace(/\\/g, "/").split("/");
  const idx = parts.indexOf("data-model");
  if (idx !== -1 && idx + 1 < parts.length) return parts[idx + 1]; // bronze|silver|gold
  return "bronze";
}

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Load all contracts from contracts/
  const contractFiles = walk(CONTRACTS_DIR);
  const contracts: unknown[] = [];

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

    const fields: { name: string; type: string; description?: string }[] = [];
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

    contracts.push({
      slug,
      maturity,
      domain,
      context,
      name: (asset.name as string) || slug,
      fields,
    });
  }

  // 2. Load model files from data-model/{bronze,silver,gold}/
  const modelFiles = walk(DATA_MODEL_DIR).filter(
    (f) => path.basename(f) !== "model-global.yaml",
  );

  const models: unknown[] = [];
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
        relations.push({
          ref_name: (r.ref_name as string) || "",
          ref: (r.ref as string) || "",
        });
      }
    }
    models.push({ domain, context, layer, sourceFile: path.basename(fp), relations });
  }

  return NextResponse.json({ contracts, models });
}
