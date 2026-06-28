import { type Node, type Edge } from "@xyflow/react";

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
        context: c.context,
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
            context: srcContract.context,
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
            context: tgtContract.context,
            fields: tgtContract.fields,
            color: domainColor(tgtContract.domain),
          },
        });
      }

      const edgeKey = `${srcId}.${src.field}->${tgtId}.${tgt.field}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      const isAnimated = parsed.sign !== "-";
      const cardSource = parsed.sign === ">" ? "many" : parsed.sign === "<" ? "one" : "many";
      const cardTarget = parsed.sign === ">" ? "one" : parsed.sign === "<" ? "many" : "many";
      edges.push({
        id: edgeKey,
        source: srcId,
        target: tgtId,
        sourceHandle: src.field,
        targetHandle: tgt.field,
        label: rel.ref_name,
        type: "relationEdge",
        animated: isAnimated,
        data: { cardSource, cardTarget },
        style: {
          stroke: isAnimated ? "#64748b" : "#94a3b8",
          strokeWidth: isAnimated ? 2 : 1.5,
          strokeDasharray: isAnimated ? undefined : "4 3",
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "monospace",
          fill: "#334155",
        },
        labelBgStyle: {
          fill: "#ffffff",
          fillOpacity: 0.9,
          rx: 3,
        },
        labelBgPadding: [6, 3] as [number, number],
      });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}

// ── Layout modes ────────────────────────────────────────────────────

import dagre from "dagre";

export type LayoutMode = "LR" | "TB" | "layer" | "domain";

function nodeFieldCount(node: Node): number {
  const fields = (node.data as Record<string, unknown>)?.fields;
  return Array.isArray(fields) ? fields.length : 0;
}

function nodeHeight(node: Node): number {
  const count = nodeFieldCount(node);
  return count ? count * 28 + 60 : 80;
}

export function layoutGraph(nodes: Node[], edges: Edge[], direction: "LR" | "TB" = "LR"): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 100, ranksep: 160, marginx: 80, marginy: 80 });

  for (const node of nodes) {
    g.setNode(node.id, { width: 220, height: nodeHeight(node) });
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

export function layoutLayerGraph(nodes: Node[], _edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const LAYER_ORDER = ["bronze", "silver", "gold"];
  const COLUMN_WIDTH = 380;
  const VERTICAL_GAP = 50;

  // Single pass: group + cache heights
  const heights = new Map<string, number>();
  const byLayer = new Map<string, Node[]>();
  for (const n of nodes) {
    const h = nodeHeight(n);
    heights.set(n.id, h);
    const maturity = ((n.data as Record<string, unknown>)?.maturity as string) || "bronze";
    if (!byLayer.has(maturity)) byLayer.set(maturity, []);
    byLayer.get(maturity)!.push(n);
  }

  // Compute positions
  const positions = new Map<string, { x: number; y: number }>();

  for (let colIdx = 0; colIdx < LAYER_ORDER.length; colIdx++) {
    const ns = byLayer.get(LAYER_ORDER[colIdx]);
    if (!ns) continue;

    let totalHeight = 0;
    for (const n of ns) totalHeight += heights.get(n.id)!;
    totalHeight += (ns.length - 1) * VERTICAL_GAP;

    let y = -totalHeight / 2;
    const x = colIdx * COLUMN_WIDTH;

    for (const n of ns) {
      const h = heights.get(n.id)!;
      positions.set(n.id, { x, y: y + h / 2 });
      y += h + VERTICAL_GAP;
    }
  }

  // Single output pass
  const laidOut = nodes.map((n) => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });

  return { nodes: laidOut, edges: _edges };
}

export function layoutDomainGraph(nodes: Node[], _edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const COLUMN_WIDTH = 280;
  const DOMAIN_GAP_X = 120;
  const VERTICAL_GAP = 40;

  // Single pass: group + cache heights
  const heights = new Map<string, number>();
  const byDomain = new Map<string, Node[]>();
  for (const n of nodes) {
    heights.set(n.id, nodeHeight(n));
    const domain = ((n.data as Record<string, unknown>)?.domain as string) || "Unknown";
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(n);
  }

  const sortedEntries = Array.from(byDomain.entries()).sort(([a], [b]) => a.localeCompare(b));
  const positions = new Map<string, { x: number; y: number }>();

  let xOffset = -(sortedEntries.length * (COLUMN_WIDTH + DOMAIN_GAP_X) - DOMAIN_GAP_X) / 2;

  for (const [, ns] of sortedEntries) {
    let totalHeight = 0;
    for (const n of ns) totalHeight += heights.get(n.id)!;
    totalHeight += (ns.length - 1) * VERTICAL_GAP;

    let y = -totalHeight / 2;

    for (const n of ns) {
      const h = heights.get(n.id)!;
      positions.set(n.id, { x: xOffset, y: y + h / 2 });
      y += h + VERTICAL_GAP;
    }

    xOffset += COLUMN_WIDTH + DOMAIN_GAP_X;
  }

  // Single output pass
  const laidOut = nodes.map((n) => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });

  return { nodes: laidOut, edges: _edges };
}

export function layoutByMode(nodes: Node[], edges: Edge[], mode: LayoutMode): { nodes: Node[]; edges: Edge[] } {
  switch (mode) {
    case "LR":
    case "TB":
      return layoutGraph(nodes, edges, mode);
    case "layer":
      return layoutLayerGraph(nodes, edges);
    case "domain":
      return layoutDomainGraph(nodes, edges);
  }
}
