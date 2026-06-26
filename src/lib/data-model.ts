import type { Node, Edge } from "@xyflow/react";

// ── Types ──────────────────────────────────────────────────────────

export type ContractField = {
  name: string;
  type: string;
  description?: string;
};

export type DataModelContract = {
  slug: string;
  maturity: "bronze" | "silver" | "gold";
  domain: string;
  context: string;
  name: string;
  fields: ContractField[];
};

export type DataModelRelation = {
  ref_name: string;
  ref: string;
};

export type DataModelDomain = {
  domain: string;
  context: string;
  relations?: DataModelRelation[];
};

export type DataModelIndex = {
  domains: DataModelDomain[];
};

export type ResolvedContract = {
  layer: string;
  domain: string;
  context: string;
  slug: string;
  field: string;
};

// ── Ref parser (mirrors generate-models.mjs) ───────────────────────

function expand(side: string, defaults: { layer: string; domain: string; context: string }): ResolvedContract | null {
  let { layer, domain, context } = defaults;
  const colonIdx = side.lastIndexOf(":");
  let slug: string, field: string;
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
    if (["bronze", "silver", "gold"].includes(parts[0])) { layer = parts[0]; idx = 1; }
    if (parts.length > idx) domain = parts[idx];
    if (parts.length > idx + 1) context = parts[idx + 1];
  }
  return { layer, domain, context, slug, field };
}

function parseRef(refStr: string, defaults: { layer: string; domain: string; context: string }): { left: ResolvedContract; sign: string; right: ResolvedContract } | null {
  const m = refStr.match(/^(.+?)\s*([><-])\s*(.+)$/);
  if (!m) return null;
  const left = expand(m[1].trim(), defaults);
  const right = expand(m[3].trim(), defaults);
  if (!left || !right) return null;
  return { left, sign: m[2], right };
}

// ── Build lookup ───────────────────────────────────────────────────

type ContractKey = string; // "layer.domain.context.slug"
function keyOf(r: ResolvedContract): ContractKey {
  return `${r.layer}.${r.domain}.${r.context}.${r.slug}`;
}

// ── Main transform ─────────────────────────────────────────────────

export type GraphData = {
  nodes: Node[];
  edges: Edge[];
};

export type LoadedModel = {
  domain: string;
  context: string;
  relations: { ref_name: string; ref: string }[];
  sourceFile: string;
  layer: string;
};

function domainColor(domain: string): string {
  let hash = 0;
  for (let i = 0; i < domain.length; i++)
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 50%)`;
}

function slugToId(slug: string, maturity: string): string {
  return `${maturity}_${slug}`;
}

export function parseContractsToGraph(
  contracts: DataModelContract[],
  models: LoadedModel[],
): GraphData {
  // Build lookup: key → contract
  const contractMap = new Map<ContractKey, DataModelContract>();
  for (const c of contracts) {
    const key = `${c.maturity}.${c.domain}.${c.context}.${c.slug}`;
    contractMap.set(key, c);
  }

  const nodeMap = new Map<string, Node>();
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];

  // 1. Create nodes for every contract
  for (const c of contracts) {
    const id = slugToId(c.slug, c.maturity);
    if (nodeMap.has(id)) continue;
    nodeMap.set(id, {
      id,
      type: "contractTable",
      position: { x: 0, y: 0 },
      data: {
        label: c.name,
        slug: c.slug,
        maturity: c.maturity,
        domain: c.domain,
        fields: c.fields,
        color: domainColor(c.domain),
      },
    });
  }

  // 2. Resolve relations → edges
  for (const model of models) {
    const defaults = { layer: model.layer, domain: model.domain, context: model.context };
    for (const rel of model.relations) {
      const parsed = parseRef(rel.ref, defaults);
      if (!parsed) continue;

      const src = parsed.left;
      const tgt = parsed.right;
      const srcKey = keyOf(src);
      const tgtKey = keyOf(tgt);

      const srcContract = contractMap.get(srcKey);
      const tgtContract = contractMap.get(tgtKey);
      if (!srcContract || !tgtContract) continue;

      const srcId = slugToId(srcContract.slug, srcContract.maturity);
      const tgtId = slugToId(tgtContract.slug, tgtContract.maturity);

      // Ensure nodes exist for referenced contracts too
      if (!nodeMap.has(srcId)) {
        nodeMap.set(srcId, {
          id: srcId,
          type: "contractTable",
          position: { x: 0, y: 0 },
          data: {
            label: srcContract.name,
            slug: srcContract.slug,
            maturity: srcContract.maturity,
            domain: srcContract.domain,
            fields: srcContract.fields,
            color: domainColor(srcContract.domain),
          },
        });
      }
      if (!nodeMap.has(tgtId)) {
        nodeMap.set(tgtId, {
          id: tgtId,
          type: "contractTable",
          position: { x: 0, y: 0 },
          data: {
            label: tgtContract.name,
            slug: tgtContract.slug,
            maturity: tgtContract.maturity,
            domain: tgtContract.domain,
            fields: tgtContract.fields,
            color: domainColor(tgtContract.domain),
          },
        });
      }

      const edgeKey = `${srcId}.${src.field}->${tgtId}.${tgt.field}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      edges.push({
        id: edgeKey,
        source: srcId,
        target: tgtId,
        sourceHandle: src.field,
        targetHandle: tgt.field,
        label: rel.ref_name,
        type: "smoothstep",
        animated: parsed.sign !== "-",
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}

// ── dagre layout ───────────────────────────────────────────────────

import dagre from "dagre";

export type LayoutDirection = "LR" | "TB";

export function layoutGraph(nodes: Node[], edges: Edge[], direction: LayoutDirection = "LR"): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 80, marginx: 40, marginy: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: 220, height: node.data?.fields?.length ? node.data.fields.length * 28 + 60 : 80 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    const dagNode = g.node(node.id);
    if (!dagNode) return node;
    return {
      ...node,
      position: { x: dagNode.x - (dagNode.width || 220) / 2, y: dagNode.y - (dagNode.height || 80) / 2 },
    };
  });

  return { nodes: laidOut, edges };
}
