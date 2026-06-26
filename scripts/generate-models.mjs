import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const REPO_DIR = "/mnt/l/CodeDev/awb/data_contracts_repo/data-contracts/contracts/published";
const CATALOG_DIR = "/mnt/l/CodeDev/awb/data-contract-catalog/data-model";

// ── 0. Ref helpers — concise ↔ expanded ──────────────────────────────

// Expand a concise side (e.g. "FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host")
// into { layer, domain, context, slug, field } given file-level defaults.
function expand(side, defaults) {
  let { layer, domain, context } = defaults;
  const colonIdx = side.lastIndexOf(":");
  let slug, field;
  if (colonIdx === -1) {
    const dotIdx = side.lastIndexOf(".");
    if (dotIdx === -1) return null;
    slug = side.slice(0, dotIdx);
    field = side.slice(dotIdx + 1);
  } else {
    const prefixStr = side.slice(0, colonIdx);
    const slugField = side.slice(colonIdx + 1);
    const dotIdx = slugField.lastIndexOf(".");
    if (dotIdx === -1) return null;
    slug = slugField.slice(0, dotIdx);
    field = slugField.slice(dotIdx + 1);
    const parts = prefixStr.split(":");
    let idx = 0;
    if (["bronze","silver","gold"].includes(parts[0])) { layer = parts[0]; idx = 1; }
    if (parts.length > idx) domain = parts[idx];
    if (parts.length > idx + 1) context = parts[idx + 1];
  }
  return { layer, domain, context, slug, field };
}

// Parse a full ref string "left > right" into { left, sign, right }
function parseRef(refStr, defaults) {
  const m = refStr.match(/^(.+?)\s*([><-])\s*(.+)$/);
  if (!m) return null;
  return {
    left: expand(m[1].trim(), defaults),
    sign: m[2],
    right: expand(m[3].trim(), defaults),
  };
}

// Format one side concisely relative to file-level defaults.
//   context different → always emit domain:context to avoid ambiguity
function formatSide(entry, defaults) {
  const parts = [];
  if (entry.layer !== defaults.layer) parts.push(entry.layer);
  if (entry.context !== defaults.context) {
    parts.push(entry.domain, entry.context);
  } else if (entry.domain !== defaults.domain) {
    parts.push(entry.domain);
  }
  const prefix = parts.length ? parts.join(":") + ":" : "";
  return `${prefix}${entry.slug}.${entry.field}`;
}

function formatRef(left, right, sign, defaults) {
  return `${formatSide(left, defaults)} ${sign} ${formatSide(right, defaults)}`;
}

// ── 1. Collect & parse every YAML ────────────────────────────────────
function walk(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(f));
    else if (e.name.endsWith(".yaml")) files.push(f);
  }
  return files;
}

const allFiles = walk(REPO_DIR);
console.log(`Files found: ${allFiles.length}`);

const contracts = [];      // { layer, domain, context, slug, pk, fields[] }
const byDomain = {};

for (const fp of allFiles) {
  const raw = fs.readFileSync(fp, "utf-8");
  let doc;
  try { doc = yaml.load(raw); } catch { continue; }
  if (!doc?.asset) continue;

  const a = doc.asset;
  const layer       = path.basename(path.dirname(fp));         // bronze|silver|gold
  const domain      = (a.domain || "").trim();
  const context     = (a.context || "").trim();
  const slug        = path.basename(fp, ".yaml");
  const pk          = Array.isArray(doc.contract?.primary_key) ? doc.contract.primary_key : [];

  const fields = [];
  if (doc.contract?.schema?.fields) {
    for (const f of doc.contract.schema.fields) fields.push(f.name);
  }
  if (!fields.length && layer === "bronze") {
    fields.push("ID", "NUM_ENR", "SOURCE", "CREATED_AT");
  }

  const entry = { layer, domain, context, slug, pk, fields };
  contracts.push(entry);
  const key = domain || "__empty__";
  if (!byDomain[key]) byDomain[key] = [];
  byDomain[key].push(entry);
}

console.log(`Contracts parsed: ${contracts.length}`);
console.log(`Distinct domains: ${Object.keys(byDomain).length}`);

// ── 2. Heuristics for meaningful relations ───────────────────────────

function sharedField(a, b) {
  const aSet = new Set(a.fields.map(f => f.toLowerCase()));
  for (const f of b.fields) {
    if (aSet.has(f.toLowerCase()) && !["run_date","version","created_at"].includes(f.toLowerCase()))
      return f;
  }
  if (a.fields.includes("ID") && b.fields.includes("ID")) return "ID";
  if (a.fields.includes("NUM_ENR") && b.fields.includes("NUM_ENR")) return "NUM_ENR";
  return null;
}

function firstPK(c) {
  return c.pk.length ? c.pk[0] : (c.fields.includes("ID") ? "ID" : c.fields[0] || null);
}

// ── 3. Auto-generate bronze domain files ─────────────────────────────

const SKIP = ["crm","dat","carte","fiche_signal","pnb","gestionnaire","gestionnaire2","credit","titres"];
const sortedDomains = Object.keys(byDomain).filter(d => d !== "__empty__").sort();

for (const domain of sortedDomains) {
  const entries = byDomain[domain];
  const contexts = [...new Set(entries.map(e => e.context))].sort();
  const layers   = [...new Set(entries.map(e => e.layer))].sort();

  if (SKIP.includes(domain.toLowerCase())) {
    console.log(`  SKIP  ${domain} (hand-crafted)`);
    continue;
  }

  const firstCtx = contexts[0] || "";
  const defaults = { layer: "bronze", domain, context: firstCtx };
  let out  = `# ${domain} — Data Relations\n`;
  out    += `# ${entries.length} contracts · ${contexts.length} contexts · ${layers.join(", ")}\n\n`;
  out    += `domain: ${domain}\ncontext: ${firstCtx}\n\nrelations:\n`;
  let rels = 0;
  const seen = new Set();

  // a) Intra-context: link sequential numbered files via ID
  const byCtx = {};
  for (const e of entries) {
    if (!byCtx[e.context]) byCtx[e.context] = [];
    byCtx[e.context].push(e);
  }
  for (const [ctx, grp] of Object.entries(byCtx)) {
    grp.sort((a, b) => a.slug.localeCompare(b.slug));
    const bases = {};
    for (const e of grp) {
      const base = e.slug.replace(/\/\d+$/, "");
      if (!bases[base]) bases[base] = [];
      bases[base].push(e);
    }
    for (const [base, list] of Object.entries(bases)) {
      if (list.length < 2) continue;
      const pk = firstPK(list[0]) || "ID";
      for (let i = 1; i < list.length; i++) {
        const l = list[0], r = list[i];
        const key = `${l.slug}.${pk}>${r.slug}.${pk}`;
        if (seen.has(key)) continue; seen.add(key);
        const ref = formatRef(
          { layer: defaults.layer, domain: defaults.domain, context: ctx, slug: l.slug, field: pk },
          { layer: defaults.layer, domain: defaults.domain, context: ctx, slug: r.slug, field: pk },
          ">", defaults
        );
        out += `  - ref_name: "${ctx.replace(/_/g,"_")}_partition"\n    ref: "${ref}"\n\n`;
        rels++;
      }
    }
  }

  // b) Inter-context: link first contract of each context
  if (contexts.length > 1) {
    const cList = contexts.map(c => ({ ctx: c, e: byCtx[c][0] }));
    const base = cList.shift();
    for (const other of cList) {
      const field = sharedField(base.e, other.e) || "ID";
      const key = `${base.e.slug}.${field}>${other.e.slug}.${field}`;
      if (seen.has(key)) continue; seen.add(key);
      const ref = formatRef(
        { layer: defaults.layer, domain: defaults.domain, context: base.e.context, slug: base.e.slug, field },
        { layer: defaults.layer, domain: defaults.domain, context: other.e.context, slug: other.e.slug, field },
        ">", defaults
      );
      out += `  - ref_name: "cross_${domain}_${other.ctx}"\n    ref: "${ref}"\n\n`;
      rels++;
    }
  }

  if (rels === 0) out += `  # No intra-domain relations (single contract)\n`;
  const fn = `model-${domain.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.yaml`;
  const targetDir = path.join(CATALOG_DIR, "bronze");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, fn), out);
  console.log(`  bronze/${fn.padEnd(35)} ${contexts.length} ctx · ${rels} rels`);
}

// ── 4. Silver/Gold hand-crafted domain files ─────────────────────────

function writeDomain(subdir, fileName, domain, context, rels) {
  const fullDir = path.join(CATALOG_DIR, subdir);
  fs.mkdirSync(fullDir, { recursive: true });
  let out  = `# ${domain} — Data Relations\n# Manually curated\n\ndomain: ${domain}\ncontext: ${context}\n\nrelations:\n`;
  for (const r of rels) {
    out += `  - ref_name: "${r.name}"\n    ref: "${r.ref}"\n\n`;
  }
  fs.writeFileSync(path.join(fullDir, fileName), out);
  console.log(`  ${subdir}/${fileName.padEnd(35)} hand-crafted · ${rels.length} rels`);
}

// ── CRM ──
writeDomain("silver", "model-crm.yaml", "CRM", "RELATION_CLIENT", [
  { name: "customer_reference", ref: "crm_activities.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "customer_reference", ref: "crm_alerte.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "customer_reference", ref: "crm_reclamation.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "customer_reference", ref: "crm_ov.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "customer_reference", ref: "crm_comptes_rendu.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "feeds_gold",        ref: "crm_ov.row_id > gold:CRM:crm.row_id" },
  { name: "feeds_gold",        ref: "crm_activities.row_id > gold:CRM:crm.row_id" },
  { name: "feeds_gold",        ref: "crm_alerte.row_id > gold:CRM:crm.row_id" },
  { name: "feeds_gold",        ref: "crm_reclamation.row_id > gold:CRM:crm.row_id" },
  { name: "feeds_gold",        ref: "crm_comptes_rendu.row_id > gold:CRM:crm.row_id" },
  { name: "assigned_manager",  ref: "GESTIONNAIRE:gestionnaire.manager_id - crm_comptes_rendu.row_id" },
]);

// ── DAT ──
writeDomain("silver", "model-dat.yaml", "DAT", "PRODUITS_EPARGNE", [
  { name: "customer_reference", ref: "dat_bdc.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "customer_reference", ref: "dat_cat.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "feeds_gold",        ref: "dat_bdc.numero_contrat > gold:DAT:dat.numero_contrat" },
  { name: "feeds_gold",        ref: "dat_cat.numero_contrat > gold:DAT:dat.numero_contrat" },
]);

// ── CARTE ──
writeDomain("silver", "model-carte.yaml", "CARTE", "EQUIPEMENT", [
  { name: "customer_reference", ref: "carte.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
]);

// ── FICHE_SIGNAL (customer master) ──
writeDomain("silver", "model-fiche-signal.yaml", "FICHE_SIGNAL", "CLIENT", [
  { name: "profile_reference", ref: "fiche_signaletique.numero_client - GESTIONNAIRE:gestionnaire.customer_id" },
]);

// ── GESTIONNAIRE ──
writeDomain("silver", "model-gestionnaire.yaml", "GESTIONNAIRE", "RELATION_CLIENT", [
  { name: "customer_reference", ref: "gestionnaire.customer_id > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_client" },
  { name: "feeds_gold",        ref: "gestionnaire.manager_id > gold:GESTIONNAIRE:gestionnaire.manager_id" },
]);

// ── CREDIT (finance portfolio — gold domain) ──
writeDomain("gold", "model-credit.yaml", "CREDIT", "ENGAGEMENT", [
  { name: "customer_reference",     ref: "silver:PNB:RENTABILITE:pnb.numero_personne_host > silver:FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "customer_reference",     ref: "silver:TITRES:TITRES:titres.numero_personne_host > silver:FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "customer_reference",     ref: "silver:TITRES:TITRES:titres_entete.numero_personne_host > silver:FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
  { name: "portfolio_header",       ref: "silver:TITRES:TITRES:titres_entete.compte_titre < silver:TITRES:TITRES:titres.compte_titre" },
  { name: "feeds_gold",             ref: "silver:PNB:RENTABILITE:pnb.numero_contrat > credit_engagement.engagement_id" },
  { name: "feeds_gold",             ref: "silver:TITRES:TITRES:titres.numero_personne_host > credit_engagement.engagement_id" },
  { name: "feeds_gold",             ref: "silver:TITRES:TITRES:titres_entete.numero_personne_host > credit_engagement.engagement_id" },
]);

// ── TITRES (empty domain — grouped as TITRES) ──
writeDomain("silver", "model-titres.yaml", "TITRES", "TITRES", [
  { name: "portfolio_hierarchy", ref: "titres_entete.numero_personne_host < titres.numero_personne_host" },
  { name: "portfolio_holds",     ref: "titres_entete.compte_titre < titres.compte_titre" },
]);

// ── PNB ──
writeDomain("silver", "model-pnb.yaml", "PNB", "RENTABILITE", [
  { name: "customer_reference", ref: "pnb.numero_personne_host > FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_personne_host" },
]);

// ── GESTIONNAIRE2 (gold variant) ──
writeDomain("gold", "model-gestionnaire2.yaml", "GESTIONNAIRE2", "RELATION_CLIENT2", [
  { name: "customer_reference", ref: "gestionnaire2.manager_id > silver:FICHE_SIGNAL:CLIENT:fiche_signaletique.numero_client" },
]);

// ── 5. model-global.yaml ──────────────────────────────────────────────
function collectYaml(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...collectYaml(f));
    else if (e.name.startsWith("model-") && e.name.endsWith(".yaml")) files.push(f);
  }
  return files;
}

const allDomainFiles = collectYaml(CATALOG_DIR)
  .filter(f => path.basename(f) !== "model-global.yaml")
  .sort();

let global  = `# Data Model — Global Import File\n# Aggregates ${allDomainFiles.length} domain files\n\ndomains:\n`;
for (const f of allDomainFiles) {
  const rel = path.relative(CATALOG_DIR, f).replace(/\\/g, "/");
  global += `  - \$ref: "./${rel}"\n`;
}
fs.writeFileSync(path.join(CATALOG_DIR, "model-global.yaml"), global);
console.log(`\nWrote model-global.yaml (${allDomainFiles.length} domains)`);

// ── 6. Summary ──────────────────────────────────────────────────────
const handCount = SKIP.length;
const autoCount = sortedDomains.length - handCount;
console.log(`\nDone.  ${autoCount} auto-generated in bronze/ + ${handCount} hand-crafted in silver/ & gold/ = ${allDomainFiles.length} domain files.`);
