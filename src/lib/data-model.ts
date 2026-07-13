import { Position, type Node, type Edge } from "@xyflow/react";

export type EdgeWithPorts = Edge & { sourcePosition?: Position; targetPosition?: Position };

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
  description?: string;
  fields: ContractField[];
  relations?: DataModelRelation[];
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
  orphanRefs: string[];
};

export type ContractTableNodeData = Record<string, unknown> & {
  label: string;
  slug: string;
  maturity: "bronze" | "silver" | "gold";
  domain: string;
  context?: string;
  fields: { name: string; type: string; description?: string }[];
  color: string;
};

export type LoadedModel = {
  domain: string;
  context: string;
  relations: { ref_name: string; ref: string }[];
  sourceFile: string;
  layer: string;
};

const layerStroke: Record<string, string> = {
  bronze: "#b45309",
  silver: "#475569",
  gold: "#a16207",
};
const layerStrokeLight: Record<string, string> = {
  bronze: "#d97706",
  silver: "#64748b",
  gold: "#ca8a04",
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

function createNode(c: DataModelContract): Node {
  return {
    id: slugToId(c.slug, c.maturity),
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
  };
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
  const orphanRefs: string[] = [];

  // 1. Create nodes for every contract
  for (const c of contracts) {
    const id = slugToId(c.slug, c.maturity);
    if (nodeMap.has(id)) continue;
    nodeMap.set(id, createNode(c));
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
      if (!srcContract || !tgtContract) {
        orphanRefs.push(rel.ref);
        continue;
      }

      // Skip edges referencing fields that don't exist in the contract
      const srcFieldOk = srcContract.fields.some((f) => f.name === src.field);
      const tgtFieldOk = tgtContract.fields.some((f) => f.name === tgt.field);
      if (!srcFieldOk || !tgtFieldOk) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[data-model] Skipping edge "${rel.ref}": field "${!srcFieldOk ? src.field : tgt.field}" not found in ${!srcFieldOk ? srcContract.slug : tgtContract.slug}`);
        }
        continue;
      }

      const srcId = slugToId(srcContract.slug, srcContract.maturity);
      const tgtId = slugToId(tgtContract.slug, tgtContract.maturity);

      if (!nodeMap.has(srcId)) nodeMap.set(srcId, createNode(srcContract));
      if (!nodeMap.has(tgtId)) nodeMap.set(tgtId, createNode(tgtContract));

      const edgeKey = `${srcId}.${src.field}->${tgtId}.${tgt.field}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      const srcLayer = srcContract.maturity || "bronze";
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
          stroke: isAnimated ? layerStroke[srcLayer] : layerStrokeLight[srcLayer],
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

  // 3. Resolve contract-level relations → edges
  for (const contract of contracts) {
    if (!contract.relations || contract.relations.length === 0) continue;
    const defaults = { layer: contract.maturity, domain: contract.domain, context: contract.context };
    for (const rel of contract.relations) {
      const parsed = parseRef(rel.ref, defaults);
      if (!parsed) continue;

      const src = parsed.left;
      const tgt = parsed.right;
      const srcKey = keyOf(src);
      const tgtKey = keyOf(tgt);

      const srcContract = contractMap.get(srcKey);
      const tgtContract = contractMap.get(tgtKey);
      if (!srcContract || !tgtContract) {
        orphanRefs.push(rel.ref);
        continue;
      }

      const srcFieldOk = srcContract.fields.some((f) => f.name === src.field);
      const tgtFieldOk = tgtContract.fields.some((f) => f.name === tgt.field);
      if (!srcFieldOk || !tgtFieldOk) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[data-model] Skipping contract edge "${rel.ref}": field "${!srcFieldOk ? src.field : tgt.field}" not found in ${!srcFieldOk ? srcContract.slug : tgtContract.slug}`);
        }
        continue;
      }

      const srcId = slugToId(srcContract.slug, srcContract.maturity);
      const tgtId = slugToId(tgtContract.slug, tgtContract.maturity);

      if (!nodeMap.has(srcId)) nodeMap.set(srcId, createNode(srcContract));
      if (!nodeMap.has(tgtId)) nodeMap.set(tgtId, createNode(tgtContract));

      const edgeKey = `${srcId}.${src.field}->${tgtId}.${tgt.field}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      edges.push({
        id: edgeKey,
        source: srcId,
        target: tgtId,
        sourceHandle: src.field,
        targetHandle: tgt.field,
        label: rel.ref_name || `${src.field} → ${tgt.field}`,
        type: "relationEdge",
        style: { stroke: "#94a3b8", strokeWidth: 2 },
        animated: false,
        data: { ref: rel.ref, ref_name: rel.ref_name },
        labelStyle: {
          fontSize: 11,
          fontWeight: 500,
          fill: "#475569",
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

  // Assign offset indices to parallel edges (same source + target) to prevent overlap
  const pairCount = new Map<string, number>();
  for (const e of edges) {
    const key = `${e.source}|${e.target}`;
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }
  const pairIdx = new Map<string, number>();
  for (const e of edges) {
    const key = `${e.source}|${e.target}`;
    const total = pairCount.get(key)!;
    const idx = pairIdx.get(key) ?? 0;
    pairIdx.set(key, idx + 1);
    e.data = { ...(e.data as object || {}), parallelOffset: idx - (total - 1) / 2 };
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    orphanRefs,
  };
}

// ── Layout modes ────────────────────────────────────────────────────

import dagre from "dagre";

function layoutOrphanGrid(
  orphans: Node[],
  heights: Map<string, number>,
  gap: number,
): { positions: Map<string, { x: number; y: number }>; gridWidth: number } {
  if (orphans.length === 0) return { positions: new Map(), gridWidth: 0 };

  const sorted = orphans.slice().sort((a, b) => {
    const sa = (a.data as ContractTableNodeData).slug || "";
    const sb = (b.data as ContractTableNodeData).slug || "";
    return sa.localeCompare(sb);
  });

  const cols = Math.ceil(Math.sqrt(sorted.length));
  const rows = cols;

  const widths = sorted.map((n) => nodeWidth(n));

  const colWidths: number[] = [];
  for (let c = 0; c < cols; c++) {
    let maxW = 0;
    for (let r = 0; r < rows; r++) {
      const idx = r * cols + c;
      if (idx < sorted.length) maxW = Math.max(maxW, widths[idx]);
    }
    colWidths.push(maxW);
  }

  const rowHeights: number[] = [];
  for (let r = 0; r < rows; r++) {
    let maxH = 0;
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < sorted.length) maxH = Math.max(maxH, heights.get(sorted[idx].id)!);
    }
    rowHeights.push(maxH);
  }

  const totalGridW = colWidths.reduce((s, w) => s + w, 0) + (cols - 1) * gap;
  const totalGridH = rowHeights.reduce((s, h) => s + h, 0) + (rows - 1) * gap;

  const colOffsets: number[] = [];
  let xA = 0;
  for (let c = 0; c < cols; c++) {
    colOffsets.push(xA);
    xA += colWidths[c] + gap;
  }

  const rowOffsets: number[] = [];
  let yA = -totalGridH / 2;
  for (let r = 0; r < rows; r++) {
    rowOffsets.push(yA);
    yA += rowHeights[r] + gap;
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < sorted.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const h = heights.get(sorted[i].id)!;
    positions.set(sorted[i].id, {
      x: colOffsets[c],
      y: rowOffsets[r] + (rowHeights[r] - h) / 2,
    });
  }

  return { positions, gridWidth: totalGridW };
}

function computeEdgePorts(dx: number, dy: number, threshold = 0.8): { sourcePosition: Position; targetPosition: Position } {
  if (Math.abs(dx) > Math.abs(dy) * threshold) {
    if (dx > 0) return { sourcePosition: Position.Right, targetPosition: Position.Left };
    return { sourcePosition: Position.Left, targetPosition: Position.Right };
  }
  if (dy > 0) return { sourcePosition: Position.Bottom, targetPosition: Position.Top };
  return { sourcePosition: Position.Top, targetPosition: Position.Bottom };
}

export type LayoutMode = "LR" | "TB" | "layer" | "domain";

function nodeFieldCount(node: Node): number {
  const data = node.data as ContractTableNodeData;
  return data.fields ? data.fields.length : 0;
}

function nodeCompactCount(node: Node, connectedFields: Map<string, Set<string>>): number {
  return connectedFields.get(node.id)?.size ?? 0;
}

function nodeHeight(node: Node, connectedFields?: Map<string, Set<string>>, viewMode?: "detailed" | "compact"): number {
  const count = viewMode === "compact" && connectedFields
    ? Math.max(nodeCompactCount(node, connectedFields), 2)
    : nodeFieldCount(node);
  return Math.max(count * 28 + 60, 90);
}

function nodeWidth(node: Node): number {
  const data = node.data as ContractTableNodeData;
  const slugPx = data.slug.length * 8.5;
  let maxFieldPx = 0;
  for (const f of data.fields) {
    const namePx = f.name.length * 6.6;
    const typePx = f.type.length * 6;
    maxFieldPx = Math.max(maxFieldPx, namePx + typePx + 10);
  }
  return Math.max(Math.ceil(Math.max(slugPx, maxFieldPx) + 60), 220);
}

export function layoutGraph(nodes: Node[], edges: Edge[], direction: "LR" | "TB" = "LR", connectedFields?: Map<string, Set<string>>, viewMode?: "detailed" | "compact", containerWidth?: number): { nodes: Node[]; edges: Edge[] } {
  // Separate isolated nodes (no edges) from connected ones
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }

  const isolated = nodes.filter((n) => !connectedIds.has(n.id));
  const connected = nodes.filter((n) => connectedIds.has(n.id));

  // Layout connected nodes with dagre
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  const isCompact = viewMode === "compact";
  g.setGraph({ rankdir: direction, nodesep: isCompact ? 60 : 100, ranksep: isCompact ? 120 : 180, marginx: 80, marginy: 80 });

  for (const node of connected) {
    g.setNode(node.id, { width: nodeWidth(node), height: nodeHeight(node, connectedFields, viewMode) });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = new Map<string, Node>();
  for (const node of connected) {
    const dagNode = g.node(node.id);
    if (dagNode) {
      laidOut.set(node.id, {
        ...node,
        position: { x: dagNode.x - (dagNode.width || 220) / 2, y: dagNode.y - (dagNode.height || 80) / 2 },
      });
    }
  }

  // Position isolated nodes in a square grid left of the connected graph
  if (isolated.length > 0) {
    const gap = 30;
    const heights = new Map<string, number>();
    for (const n of isolated) {
      heights.set(n.id, nodeHeight(n, connectedFields, viewMode));
    }

    const { positions, gridWidth } = layoutOrphanGrid(isolated, heights, gap);
    const gridLeft = connected.length > 0
      ? Math.min(...Array.from(laidOut.values()).map((n) => n.position.x)) - gridWidth - 80
      : -gridWidth / 2;

    for (const [id, pos] of positions) {
      laidOut.set(id, { ...(nodes.find((n) => n.id === id)!), position: { x: pos.x + gridLeft, y: pos.y } });
    }
  }

  // Compute optimal edge port sides based on final node positions
  const edgesWithPorts = edges as EdgeWithPorts[];
  for (const edge of edgesWithPorts) {
    const src = laidOut.get(edge.source) ?? nodes.find((n) => n.id === edge.source);
    const tgt = laidOut.get(edge.target) ?? nodes.find((n) => n.id === edge.target);
    if (src && tgt) {
      const dx = tgt.position.x - src.position.x;
      const dy = tgt.position.y - src.position.y;
      Object.assign(edge, computeEdgePorts(dx, dy));
    }
  }

  return { nodes: nodes.map((n) => laidOut.get(n.id) || n), edges };
}

export function layoutLayerGraph(nodes: Node[], edges: Edge[], connectedFields?: Map<string, Set<string>>, viewMode?: "detailed" | "compact"): { nodes: Node[]; edges: Edge[] } {
  const LAYER_ORDER = ["bronze", "silver", "gold"];
  const COLUMN_WIDTH = 480;
  const VERTICAL_GAP = 60;

  // Separate connected from orphan (isolated) nodes
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  const connected = nodes.filter((n) => connectedIds.has(n.id));
  const orphans = nodes.filter((n) => !connectedIds.has(n.id));

  // Heights cache for all nodes
  const heights = new Map<string, number>();
  for (const n of nodes) {
    heights.set(n.id, nodeHeight(n, connectedFields, viewMode));
  }

  // --- Layout connected nodes by layer ---
  const byLayer = new Map<string, Node[]>();
  for (const n of connected) {
    const maturity = (n.data as ContractTableNodeData).maturity || "bronze";
    if (!byLayer.has(maturity)) byLayer.set(maturity, []);
    byLayer.get(maturity)!.push(n);
  }

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

  // --- Layout orphan tables in a grid to the right ---
  if (orphans.length > 0) {
    const orphanGap = 30;
    const { positions: orphanPositions } = layoutOrphanGrid(orphans, heights, orphanGap);
    const gridLeft = (connected.length > 0 ? LAYER_ORDER.length * COLUMN_WIDTH : 0) + orphanGap * 2;
    for (const [id, pos] of orphanPositions) {
      positions.set(id, { x: pos.x + gridLeft, y: pos.y });
    }
  }

  // --- Layer background boxes ---
  const bgNodes: Node[] = [];
  for (const layer of LAYER_ORDER) {
    const ns = byLayer.get(layer);
    if (!ns || ns.length === 0) continue;

    let minY = Infinity, maxY = -Infinity;
    let maxW = 0;
    for (const n of ns) {
      const pos = positions.get(n.id);
      if (!pos) continue;
      const h = heights.get(n.id)!;
      const w = nodeWidth(n);
      minY = Math.min(minY, pos.y - h / 2);
      maxY = Math.max(maxY, pos.y + h / 2);
      maxW = Math.max(maxW, w);
    }

    const pad = 20;
    const cx = LAYER_ORDER.indexOf(layer) * COLUMN_WIDTH;
    const bw = maxW + pad * 2;
    const bh = maxY - minY + pad * 2;

    bgNodes.push({
      id: `__bg_${layer}`,
      type: "layerBackground" as any,
      position: { x: cx, y: (minY + maxY) / 2 },
      data: { label: layer, width: bw, height: bh },
      draggable: false,
      selectable: false,
      style: { width: bw, height: bh, zIndex: -1 },
    });
  }

  const laidOut = nodes.map((n) => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });

  // Compute optimal edge ports
  const layerEdges = edges as EdgeWithPorts[];
  for (const edge of layerEdges) {
    const src = positions.get(edge.source) ?? nodes.find((n) => n.id === edge.source)?.position;
    const tgt = positions.get(edge.target) ?? nodes.find((n) => n.id === edge.target)?.position;
    if (src && tgt) {
      Object.assign(edge, computeEdgePorts(tgt.x - src.x, tgt.y - src.y));
    }
  }

  return { nodes: [...bgNodes, ...laidOut], edges };
}

export function layoutDomainGraph(nodes: Node[], edges: Edge[], connectedFields?: Map<string, Set<string>>, viewMode?: "detailed" | "compact"): { nodes: Node[]; edges: Edge[] } {
  const COLUMN_WIDTH = 320;
  const DOMAIN_GAP_X = 160;
  const VERTICAL_GAP = 50;

  // Separate connected from orphan (isolated) nodes
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  const connected = nodes.filter((n) => connectedIds.has(n.id));
  const orphans = nodes.filter((n) => !connectedIds.has(n.id));

  // Heights cache for all nodes
  const heights = new Map<string, number>();
  for (const n of nodes) {
    heights.set(n.id, nodeHeight(n, connectedFields, viewMode));
  }

  // --- Layout connected nodes by domain ---
  const byDomain = new Map<string, Node[]>();
  for (const n of connected) {
    const domain = (n.data as ContractTableNodeData).domain || "Unknown";
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(n);
  }

  const positions = new Map<string, { x: number; y: number }>();

  const sortedEntries = Array.from(byDomain.entries()).sort(([a], [b]) => a.localeCompare(b));
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

  // --- Layout orphan tables in a square grid to the right ---
  if (orphans.length > 0) {
    const orphanGap = 30;
    const { positions: orphanPositions } = layoutOrphanGrid(orphans, heights, orphanGap);
    const gridLeft = (connected.length > 0 ? xOffset : 0) + orphanGap * 2;
    for (const [id, pos] of orphanPositions) {
      positions.set(id, { x: pos.x + gridLeft, y: pos.y });
    }
  }

  // Compute optimal edge ports
  const domainEdges = edges as EdgeWithPorts[];
  for (const edge of domainEdges) {
    const src = positions.get(edge.source) ?? nodes.find((n) => n.id === edge.source)?.position;
    const tgt = positions.get(edge.target) ?? nodes.find((n) => n.id === edge.target)?.position;
    if (src && tgt) {
      Object.assign(edge, computeEdgePorts(tgt.x - src.x, tgt.y - src.y));
    }
  }

  // Single output pass
  const laidOut = nodes.map((n) => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });

  return { nodes: laidOut, edges };
}

export function layoutByMode(nodes: Node[], edges: Edge[], mode: LayoutMode, connectedFields?: Map<string, Set<string>>, viewMode?: "detailed" | "compact", containerWidth?: number): { nodes: Node[]; edges: Edge[] } {
  switch (mode) {
    case "LR":
    case "TB":
      return layoutGraph(nodes, edges, mode, connectedFields, viewMode, containerWidth);
    case "layer":
      return layoutLayerGraph(nodes, edges, connectedFields, viewMode);
    case "domain":
      return layoutDomainGraph(nodes, edges, connectedFields, viewMode);
  }
}
