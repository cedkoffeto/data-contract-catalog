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
  let raw = side.startsWith("@") ? side.slice(1) : side;
  const colonIdx = raw.lastIndexOf(":");
  let slug: string, field: string;
  if (colonIdx === -1) {
    const dotIdx = raw.lastIndexOf(".");
    if (dotIdx === -1) return null;
    slug = raw.slice(0, dotIdx);
    field = raw.slice(dotIdx + 1);
  } else {
    const prefixStr = raw.slice(0, colonIdx);
    const slugField = raw.slice(colonIdx + 1);
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
  relationErrors?: { field: string; targetSlug: string; ref: string; message: string }[];
  _customWidth?: number;
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
  models: LoadedModel[] = [],
): GraphData {
  // Build lookup: key → contract + slug → contract fallback + field name sets
  const contractMap = new Map<ContractKey, DataModelContract>();
  const slugMap = new Map<string, DataModelContract>();
  const fieldNamesBySlug = new Map<string, Set<string>>();
  for (const c of contracts) {
    const key = `${c.maturity}.${c.domain}.${c.context}.${c.slug}`;
    contractMap.set(key, c);
    // Keep first occurrence for slug-only lookups
    if (!slugMap.has(c.slug)) slugMap.set(c.slug, c);
    if (!fieldNamesBySlug.has(c.slug)) fieldNamesBySlug.set(c.slug, new Set(c.fields.map((f) => f.name)));
  }

  const nodeMap = new Map<string, Node>();
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  const orphanRefs: string[] = [];
  const relationErrorsByNode = new Map<string, { field: string; targetSlug: string; ref: string; message: string }[]>();

  function addRelationError(nodeId: string, error: { field: string; targetSlug: string; ref: string; message: string }) {
    const arr = relationErrorsByNode.get(nodeId);
    if (arr) arr.push(error);
    else relationErrorsByNode.set(nodeId, [error]);
  }

  // 1. Create nodes for every contract
  for (const c of contracts) {
    const id = slugToId(c.slug, c.maturity);
    if (nodeMap.has(id)) continue;
    nodeMap.set(id, createNode(c));
  }

  function resolveRelation(
    refStr: string,
    refName: string,
    defaults: { layer: string; domain: string; context: string },
  ): Edge | null {
    const parsed = parseRef(refStr, defaults);
    if (!parsed) return null;

    const src = parsed.left;
    const tgt = parsed.right;
    const sign = parsed.sign;
    const srcKey = keyOf(src);
    const tgtKey = keyOf(tgt);

    const srcContract = contractMap.get(srcKey) ?? slugMap.get(src.slug);
    const tgtContract = contractMap.get(tgtKey) ?? slugMap.get(tgt.slug);
    if (!srcContract || !tgtContract) {
      orphanRefs.push(refStr);
      return null;
    }

    const srcFieldNames = fieldNamesBySlug.get(srcContract.slug);
    const tgtFieldNames = fieldNamesBySlug.get(tgtContract.slug);
    const srcFieldOk = srcFieldNames?.has(src.field) ?? false;
    const tgtFieldOk = tgtFieldNames?.has(tgt.field) ?? false;

    if (!srcFieldOk || !tgtFieldOk) {
      const srcId = slugToId(srcContract.slug, srcContract.maturity);
      const tgtId = slugToId(tgtContract.slug, tgtContract.maturity);
      if (!srcFieldOk) {
        addRelationError(srcId, {
          field: src.field,
          targetSlug: tgtContract.slug,
          ref: refStr,
          message: `Field "${src.field}" not found in ${srcContract.slug}`,
        });
      }
      if (!tgtFieldOk) {
        addRelationError(tgtId, {
          field: tgt.field,
          targetSlug: srcContract.slug,
          ref: refStr,
          message: `Field "${tgt.field}" not found in ${tgtContract.slug}`,
        });
      }
      return null;
    }

    const srcId = slugToId(srcContract.slug, srcContract.maturity);
    const tgtId = slugToId(tgtContract.slug, tgtContract.maturity);

    if (!nodeMap.has(srcId)) nodeMap.set(srcId, createNode(srcContract));
    if (!nodeMap.has(tgtId)) nodeMap.set(tgtId, createNode(tgtContract));

    const edgeKey = `${srcId}.${src.field}->${tgtId}.${tgt.field}`;
    if (edgeSet.has(edgeKey)) return null;
    edgeSet.add(edgeKey);

    let cardSource: "one" | "many" = "one";
    let cardTarget: "one" | "many" = "one";
    if (sign === ">") { cardSource = "many"; cardTarget = "one"; }
    else if (sign === "<") { cardSource = "one"; cardTarget = "many"; }

    return {
      id: edgeKey,
      source: srcId,
      target: tgtId,
      sourceHandle: src.field,
      targetHandle: tgt.field,
      label: refName || `${src.field} → ${tgt.field}`,
      type: "relationEdge",
      style: { stroke: "#94a3b8", strokeWidth: 2 },
      animated: false,
      data: { ref: refStr, ref_name: refName, cardSource, cardTarget, parsed: { left: src, right: tgt } },
      labelStyle: { fontSize: 11, fontWeight: 500, fill: "#475569" },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9, rx: 3 },
      labelBgPadding: [6, 3] as [number, number],
    };
  }

  // 2. Resolve contract-level relations → edges
  for (const contract of contracts) {
    if (!contract.relations || contract.relations.length === 0) continue;
    const defaults = { layer: contract.maturity, domain: contract.domain, context: contract.context };
    for (const rel of contract.relations) {
      const edge = resolveRelation(rel.ref, rel.ref_name, defaults);
      if (edge) edges.push(edge);
    }
  }

  // 3. Resolve model-level relations → edges
  for (const model of models) {
    if (!model.relations || model.relations.length === 0) continue;
    const defaults = { layer: model.layer, domain: model.domain, context: model.context };
    for (const rel of model.relations) {
      const edge = resolveRelation(rel.ref, rel.ref_name, defaults);
      if (edge) edges.push(edge);
    }
  }

  // Merge edges by table pair + cardinality direction (one edge per direction)
  const mergeMap = new Map<string, Edge>();
  for (const e of edges) {
    const ed = e.data as { cardSource?: string; cardTarget?: string; ref_name?: string; ref?: string; parsed?: any };
    const mergeKey = `${e.source}|${e.target}|${ed.cardSource}|${ed.cardTarget}`;
    const existing = mergeMap.get(mergeKey);
    if (existing) {
      const existingEd = existing.data as { refs?: string[]; parsed?: any[] };
      existingEd.refs = [...(existingEd.refs ?? []), ed.ref_name ?? ed.ref ?? ""];
      existingEd.parsed = [...(existingEd.parsed ?? []), ed.parsed];
      existing.label = [existing.label, e.label].filter(Boolean).join(", ");
    } else {
      const { sourceHandle, targetHandle, ...rest } = e;
      mergeMap.set(mergeKey, {
        ...rest,
        data: {
          ...ed,
          refs: [ed.ref_name ?? ed.ref ?? ""],
          parsed: ed.parsed ? [ed.parsed] : [],
        },
      });
    }
  }

  // Attach relationErrors to nodes
  for (const [nodeId, errors] of relationErrorsByNode) {
    const node = nodeMap.get(nodeId);
    if (node) {
      node.data = { ...node.data, relationErrors: errors };
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(mergeMap.values()),
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
      if (idx < sorted.length) maxH = Math.max(maxH, heights.get(sorted[idx].id) ?? 0);
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

function computeEdgePorts(dx: number, dy: number): { sourcePosition: Position; targetPosition: Position } {
  // Always use opposite sides to create C-shapes, never S-shapes
  if (dx >= 0) return { sourcePosition: Position.Right, targetPosition: Position.Left };
  return { sourcePosition: Position.Left, targetPosition: Position.Right };
}

export type LayoutMode = "LR" | "TB" | "layer" | "domain" | "star";

function nodeHeight(node: Node, connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", collapsed?: boolean): number {
  const data = node.data as ContractTableNodeData;
  const fields = data.fields ?? [];
  const fieldEdges = connectedFields?.get(node.id);

  // In compact mode: collapsed = show only connected; expanded = show all
  // In detailed mode: always show all
  const compactCollapsed = viewMode === "compact" && !collapsed;

  let fieldCount = 0;
  for (const f of fields) {
    if (compactCollapsed && !(fieldEdges?.has(f.name))) continue;
    fieldCount++;
  }

  // header py-2 + borderBottom 2px = 38px, border-2 top+bottom = 4px
  const chromeH = 38 + 2;
  // summary row ("N connected · M hidden") when compact mode hides some fields
  const summaryH = compactCollapsed && fieldCount < fields.length ? 26 : 0;
  return Math.max(fieldCount * 33 + chromeH + summaryH, 90);
}

const NODE_WIDTH = 260;

function nodeWidth(node: Node): number {
  const custom = (node.data as ContractTableNodeData)?._customWidth;
  return typeof custom === "number" && custom > 0 ? custom : NODE_WIDTH;
}

export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
  connectedFields?: Map<string, Map<string, number>>,
  viewMode?: "detailed" | "compact",
  containerWidth?: number,
  visualGap = 30,
  collapsedTables?: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }

  const isolated = nodes.filter((n) => !connectedIds.has(n.id));
  const connected = nodes.filter((n) => connectedIds.has(n.id));

  if (connected.length === 0 && isolated.length > 0) {
    const gap = 20;
    const heights = new Map<string, number>();
    for (const n of isolated) heights.set(n.id, nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id)));
    const { positions, gridWidth } = layoutOrphanGrid(isolated, heights, gap);
    const laidOut = nodes.map((n) => {
      const pos = positions.get(n.id);
      if (!pos) return n;
      const h = nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id));
      const w = nodeWidth(n);
      return { ...n, position: { x: pos.x - gridWidth / 2, y: pos.y - h / 2 } };
    });
    return { nodes: laidOut, edges };
  }

  // ── Step 1: dagre assigns ranks (structural layering only) ──
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  // Use a large ranksep so dagre never overlaps — we fix positions after
  const maxHeight = connected.reduce((m, n) => Math.max(m, nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id))), 0);
  g.setGraph({ rankdir: direction, nodesep: 20, ranksep: maxHeight + visualGap, marginx: 80, marginy: 80 });

  for (const node of connected) {
    g.setNode(node.id, { width: nodeWidth(node), height: nodeHeight(node, connectedFields, viewMode, collapsedTables?.has(node.id)) });
  }

  const pairWeight = new Map<string, number>();
  for (const e of edges) {
    const key = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`;
    pairWeight.set(key, (pairWeight.get(key) ?? 0) + 1);
  }
  for (const edge of edges) {
    const key = edge.source < edge.target ? `${edge.source}|${edge.target}` : `${edge.target}|${edge.source}`;
    g.setEdge(edge.source, edge.target, { weight: 1 + (pairWeight.get(key) ?? 0) });
  }

  dagre.layout(g);

  // ── Step 2: read dagre-assigned ranks ──
  const nodeRanks = new Map<string, number>();
  for (const node of connected) {
    const dn = g.node(node.id);
    if (!dn) continue;
    // dagre stores rank in the graph's internal structure
    // We recover it from the node's x/y position relative to rank direction
    // In LR: ranks are along x-axis; in TB: along y-axis
    // But dagre doesn't expose rank directly — we infer from edges
  }

  // Infer ranks from DAG structure (BFS from sources)
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  for (const n of connected) { inDegree.set(n.id, 0); adjList.set(n.id, []); }
  for (const e of edges) {
    if (!inDegree.has(e.target)) continue;
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adjList.get(e.source)?.push(e.target);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) { if (deg === 0) { queue.push(id); nodeRanks.set(id, 0); } }
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const r = nodeRanks.get(id)!;
    for (const nb of adjList.get(id) ?? []) {
      const newRank = r + 1;
      if ((nodeRanks.get(nb) ?? 0) < newRank) {
        nodeRanks.set(nb, newRank);
        queue.push(nb);
      }
    }
  }

  // ── Step 3: barycenter crossing reduction (3 passes) ──
  const rankGroups = new Map<number, string[]>();
  for (const [id, rank] of nodeRanks) {
    let arr = rankGroups.get(rank);
    if (!arr) { arr = []; rankGroups.set(rank, arr); }
    arr.push(id);
  }

  // Build adjacency for barycenter
  const undirAdj = new Map<string, Set<string>>();
  for (const n of connected) undirAdj.set(n.id, new Set());
  for (const e of edges) {
    undirAdj.get(e.source)?.add(e.target);
    undirAdj.get(e.target)?.add(e.source);
  }

  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);

  for (let pass = 0; pass < 3; pass++) {
    // Forward pass: fix order based on lower neighbors
    for (let i = 1; i < sortedRanks.length; i++) {
      const rank = sortedRanks[i];
      const ids = rankGroups.get(rank)!;
      const lowerIds = rankGroups.get(sortedRanks[i - 1])!;
      const lowerPos = new Map(lowerIds.map((id, idx) => [id, idx]));
      ids.sort((a, b) => {
        const avgA = avgNeighborPos(a, lowerPos, undirAdj);
        const avgB = avgNeighborPos(b, lowerPos, undirAdj);
        return avgA - avgB;
      });
    }
    // Backward pass: fix order based on upper neighbors
    for (let i = sortedRanks.length - 2; i >= 0; i--) {
      const rank = sortedRanks[i];
      const ids = rankGroups.get(rank)!;
      const upperIds = rankGroups.get(sortedRanks[i + 1])!;
      const upperPos = new Map(upperIds.map((id, idx) => [id, idx]));
      ids.sort((a, b) => {
        const avgA = avgNeighborPos(a, upperPos, undirAdj);
        const avgB = avgNeighborPos(b, upperPos, undirAdj);
        return avgA - avgB;
      });
    }
  }

  // ── Step 4: assign positions with exact visualGap ──
  const heights = new Map<string, number>();
  for (const n of connected) heights.set(n.id, nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id)));

  const rankPositions = new Map<string, { x: number; y: number }>();
  let yOffset = 0;

  for (const rank of sortedRanks) {
    const ids = rankGroups.get(rank)!;
    // Compute total height of this rank
    let rankTotalH = 0;
    for (const id of ids) rankTotalH += heights.get(id) ?? 0;
    rankTotalH += (ids.length - 1) * 20; // nodesep within rank

    // Center this rank vertically
    let y = yOffset - rankTotalH / 2;
    for (const id of ids) {
      const h = heights.get(id) ?? 0;
      rankPositions.set(id, { x: 0, y: y + h / 2 });
      y += h + 20;
    }

    // Next rank offset: bottom of tallest node in this rank + visualGap
    const maxRankH = ids.reduce((m, id) => Math.max(m, heights.get(id) ?? 0), 0);
    yOffset += maxRankH + visualGap;
  }

  // Center the whole graph vertically
  const allY = Array.from(rankPositions.values()).map((p) => p.y);
  const centerY = (Math.min(...allY) + Math.max(...allY)) / 2;

  // Assign x positions based on direction
  const COLUMN_WIDTH = 320;
  const laidOut = new Map<string, Node>();
  for (const node of connected) {
    const rp = rankPositions.get(node.id);
    if (!rp) continue;
    const rank = nodeRanks.get(node.id) ?? 0;
    const h = heights.get(node.id) ?? 0;
    const w = nodeWidth(node);
    const x = direction === "LR" ? rank * COLUMN_WIDTH : rp.y - centerY;
    const yPos = direction === "LR" ? rp.y - centerY : rank * COLUMN_WIDTH;
    laidOut.set(node.id, {
      ...node,
      position: { x: x - w / 2, y: yPos - h / 2 },
    });
  }

  // ── Isolated nodes: grid to the left (LR) or top (TB) ──
  if (isolated.length > 0) {
    const gap = 20;
    const isoHeights = new Map<string, number>();
    for (const n of isolated) isoHeights.set(n.id, nodeHeight(n, connectedFields, viewMode));
    const { positions, gridWidth } = layoutOrphanGrid(isolated, isoHeights, gap);
    const gridLeft = connected.length > 0
      ? Math.min(...Array.from(laidOut.values()).map((n) => n.position.x)) - gridWidth - 80
      : -gridWidth / 2;
    for (const [id, pos] of positions) {
      const node = nodeById.get(id);
      if (!node) continue;
      laidOut.set(id, { ...node, position: { x: pos.x + gridLeft, y: pos.y } });
    }
  }

  // ── Compute edge ports ──
  const edgesWithPorts = edges as EdgeWithPorts[];
  for (const edge of edgesWithPorts) {
    const src = laidOut.get(edge.source) ?? nodeById.get(edge.source);
    const tgt = laidOut.get(edge.target) ?? nodeById.get(edge.target);
    if (src && tgt) {
      const dx = tgt.position.x - src.position.x;
      const dy = tgt.position.y - src.position.y;
      Object.assign(edge, computeEdgePorts(dx, dy));
    }
  }

  return { nodes: nodes.map((n) => laidOut.get(n.id) || n), edges };
}

function avgNeighborPos(nodeId: string, rankPos: Map<string, number>, adj: Map<string, Set<string>>): number {
  const neighbors = adj.get(nodeId);
  if (!neighbors || neighbors.size === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const nb of neighbors) {
    const pos = rankPos.get(nb);
    if (pos !== undefined) { sum += pos; count++; }
  }
  return count > 0 ? sum / count : 0;
}

export function layoutLayerGraph(nodes: Node[], edges: Edge[], connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", collapsedTables?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const LAYER_ORDER = ["bronze", "silver", "gold"];
  const COLUMN_WIDTH = 480;
  const VERTICAL_GAP = 20;

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
    heights.set(n.id, nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id)));
  }

  // --- Layout connected nodes by layer ---
  const byLayer = new Map<string, Node[]>();
  for (const n of connected) {
    const maturity = (n.data as ContractTableNodeData).maturity || "bronze";
    let arr = byLayer.get(maturity);
    if (!arr) { arr = []; byLayer.set(maturity, arr); }
    arr.push(n);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (let colIdx = 0; colIdx < LAYER_ORDER.length; colIdx++) {
    const ns = byLayer.get(LAYER_ORDER[colIdx]);
    if (!ns) continue;

    let totalHeight = 0;
    for (const n of ns) totalHeight += heights.get(n.id) ?? 0;
    totalHeight += (ns.length - 1) * VERTICAL_GAP;

    let y = -totalHeight / 2;
    const x = colIdx * COLUMN_WIDTH;

    for (const n of ns) {
      const h = heights.get(n.id) ?? 0;
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
      type: "layerBackground",
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
    const src = positions.get(edge.source) ?? nodeById.get(edge.source)?.position;
    const tgt = positions.get(edge.target) ?? nodeById.get(edge.target)?.position;
    if (src && tgt) {
      Object.assign(edge, computeEdgePorts(tgt.x - src.x, tgt.y - src.y));
    }
  }

  return { nodes: [...bgNodes, ...laidOut], edges };
}

export function layoutDomainGraph(nodes: Node[], edges: Edge[], connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", collapsedTables?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const COLUMN_WIDTH = 320;
  const DOMAIN_GAP_X = 60;
  const VERTICAL_GAP = 20;

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
    heights.set(n.id, nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id)));
  }

  // --- Layout connected nodes by domain ---
  const byDomain = new Map<string, Node[]>();
  for (const n of connected) {
    const domain = (n.data as ContractTableNodeData).domain || "Unknown";
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)?.push(n);
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
    const src = positions.get(edge.source) ?? nodeById.get(edge.source)?.position;
    const tgt = positions.get(edge.target) ?? nodeById.get(edge.target)?.position;
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

export function layoutStarGraph(nodes: Node[], edges: Edge[], connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", collapsedTables?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  // Build undirected adjacency
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }

  // Degree centrality
  const degree = new Map<string, number>();
  for (const [id, nb] of adj) degree.set(id, nb.size);

  // Connected components via BFS
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const n of nodes) {
    if (visited.has(n.id)) continue;
    const comp: string[] = [];
    const queue = [n.id];
    visited.add(n.id);
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      comp.push(id);
      for (const nb of adj.get(id) ?? []) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    components.push(comp);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const BASE_RADIUS = 100;
  const RADIUS_STEP = 160;

  for (let ci = 0; ci < components.length; ci++) {
    const comp = components[ci];
    if (comp.length === 0) continue;

    // Pick center: highest degree
    let center = comp[0];
    for (const id of comp) { if ((degree.get(id) ?? 0) > (degree.get(center) ?? 0)) center = id; }

    // BFS layers from center
    const layer = new Map<string, number>();
    const queue = [center];
    layer.set(center, 0);
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      for (const nb of adj.get(id) ?? []) {
        if (!layer.has(nb)) { layer.set(nb, layer.get(id)! + 1); queue.push(nb); }
      }
    }

    // Group by layer
    const byLayer = new Map<number, string[]>();
    for (const id of comp) {
      const l = layer.get(id) ?? 0;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l)?.push(id);
    }

    // Compute radius per layer (enough arc gap to avoid overlap)
    const radii = new Map<number, number>();
    let maxR = 0;
    for (const [l, ids] of byLayer) {
      const n = ids.length;
      const maxW = Math.max(...ids.map((id) => { const node = nodeMap.get(id); return node ? nodeWidth(node) : 0; }), 220);
      const minR = (n * (maxW + 40)) / (2 * Math.PI);
      const r = Math.max(BASE_RADIUS + l * RADIUS_STEP, minR);
      radii.set(l, r);
      if (r > maxR) maxR = r;
    }

    // Component horizontal offset (spread components apart)
    const compOffsetX = (ci - (components.length - 1) / 2) * (maxR * 2 + 160);

    for (const [l, ids] of byLayer) {
      const radius = l === 0 ? 0 : radii.get(l)!;
      const n = ids.length;
      for (let i = 0; i < n; i++) {
        const angle = l === 0 ? 0 : (i / n) * Math.PI * 2 - Math.PI / 2;
        positions.set(ids[i], {
          x: compOffsetX + radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      }
    }
  }

  // Edge ports
  const starEdges = edges as EdgeWithPorts[];
  for (const edge of starEdges) {
    const sp = positions.get(edge.source);
    const tp = positions.get(edge.target);
    if (sp && tp) {
      Object.assign(edge, computeEdgePorts(tp.x - sp.x, tp.y - sp.y));
    }
  }

  // Single output pass with node dimensions
  const laidOut = nodes.map((n) => {
    const pos = positions.get(n.id);
    if (!pos) return n;
    const h = nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id));
    const w = nodeWidth(n);
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });

  return { nodes: laidOut, edges };
}

export function layoutByMode(nodes: Node[], edges: Edge[], mode: LayoutMode, connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", containerWidth?: number, collapsedTables?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  switch (mode) {
    case "LR":
    case "TB":
      return layoutGraph(nodes, edges, mode, connectedFields, viewMode, containerWidth, 30, collapsedTables);
    case "layer":
      return layoutLayerGraph(nodes, edges, connectedFields, viewMode, collapsedTables);
    case "domain":
      return layoutDomainGraph(nodes, edges, connectedFields, viewMode, collapsedTables);
    case "star":
      return layoutStarGraph(nodes, edges, connectedFields, viewMode, collapsedTables);
  }
}
