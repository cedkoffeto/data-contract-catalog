import { Position, type Node, type Edge } from "@xyflow/react";

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
      sourceHandle: `${src.field}-right`,
      targetHandle: `${tgt.field}-left`,
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
      const firstParsed = ed.parsed as { left?: { field: string }; right?: { field: string } } | undefined;
      const srcHandle = firstParsed?.left?.field ? `${firstParsed.left.field}-right` : e.sourceHandle;
      const tgtHandle = firstParsed?.right?.field ? `${firstParsed.right.field}-left` : e.targetHandle;
      mergeMap.set(mergeKey, {
        ...e,
        sourceHandle: srcHandle,
        targetHandle: tgtHandle,
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

export type LayoutMode = "LR" | "TB" | "layer" | "star";

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

  // ── Step 1: BFS rank assignment (topological layering) ──
  const nodeRanks = new Map<string, number>();
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

  // ── Step 2: Insert dummy nodes for multi-rank edges ──
  const dummyIds = new Set<string>();
  const dummyPred = new Map<string, string>();

  for (const e of edges) {
    const srcRank = nodeRanks.get(e.source);
    const tgtRank = nodeRanks.get(e.target);
    if (srcRank === undefined || tgtRank === undefined) continue;
    if (tgtRank - srcRank <= 1) continue;

    let prevId = e.source;
    for (let r = srcRank + 1; r < tgtRank; r++) {
      const dummyId = `__d_${e.source}_${e.target}_${r}`;
      nodeRanks.set(dummyId, r);
      dummyIds.add(dummyId);
      dummyPred.set(dummyId, prevId);
      prevId = dummyId;
    }
  }

  // ── Step 3: group by rank ──
  const rankGroups = new Map<number, string[]>();
  for (const [id, rank] of nodeRanks) {
    let arr = rankGroups.get(rank);
    if (!arr) { arr = []; rankGroups.set(rank, arr); }
    arr.push(id);
  }

  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b);

  // ── Step 4: Build upstream/downstream adjacency ──
  const upstreamByRank = new Map<string, string[]>();

  // Direct edges between adjacent ranks
  for (const e of edges) {
    const srcRank = nodeRanks.get(e.source);
    const tgtRank = nodeRanks.get(e.target);
    if (srcRank !== undefined && tgtRank !== undefined && srcRank === tgtRank - 1) {
      const arr = upstreamByRank.get(e.target);
      if (arr) arr.push(e.source);
      else upstreamByRank.set(e.target, [e.source]);
    }
  }

  // Dummy node chain connections
  for (const dummyId of dummyIds) {
    const predId = dummyPred.get(dummyId);
    if (predId) upstreamByRank.set(dummyId, [predId]);
  }

  // Multi-rank edge targets connect to last dummy
  for (const e of edges) {
    const srcRank = nodeRanks.get(e.source);
    const tgtRank = nodeRanks.get(e.target);
    if (srcRank === undefined || tgtRank === undefined) continue;
    if (tgtRank - srcRank <= 1) continue;
    const lastDummy = `__d_${e.source}_${e.target}_${tgtRank - 1}`;
    if (dummyIds.has(lastDummy)) {
      const arr = upstreamByRank.get(e.target);
      if (arr) arr.push(lastDummy);
      else upstreamByRank.set(e.target, [lastDummy]);
    }
  }

  // Reverse: downstream adjacency
  const downstreamByRank = new Map<string, string[]>();
  for (const [targetId, sources] of upstreamByRank) {
    for (const sourceId of sources) {
      let arr = downstreamByRank.get(sourceId);
      if (!arr) { arr = []; downstreamByRank.set(sourceId, arr); }
      arr.push(targetId);
    }
  }

  // ── Step 5: Positioning — Sugiyama with barycentric ordering ──
  const isLR = direction === "LR";
  const nodeSizes = new Map<string, number>();
  const heights = new Map<string, number>();
  const widths = new Map<string, number>();
  for (const n of connected) {
    const h = nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id));
    heights.set(n.id, h);
    widths.set(n.id, nodeWidth(n));
    nodeSizes.set(n.id, isLR ? h : nodeWidth(n));
  }
  for (const dummyId of dummyIds) {
    nodeSizes.set(dummyId, 0);
  }

  // Dynamic column width: max node width + gap (never smaller than 320)
  let maxNodeW = 0;
  for (const n of connected) maxNodeW = Math.max(maxNodeW, nodeWidth(n));
  const COLUMN_WIDTH = Math.max(maxNodeW + 60, 320);
  const NODE_GAP = 30;
  const rankPositions = new Map<string, { x: number; y: number }>();

  function stackRank(ids: string[], preferredPos: Map<string, number>) {
    ids.sort((a, b) => (preferredPos.get(a) ?? 0) - (preferredPos.get(b) ?? 0));

    // Compute total stack size accounting for different node widths
    let totalSize = 0;
    for (let i = 0; i < ids.length; i++) {
      const sz = nodeSizes.get(ids[i]) ?? 0;
      totalSize += sz;
      if (!dummyIds.has(ids[i]) && i < ids.length - 1) totalSize += NODE_GAP;
    }

    const avgPP = ids.reduce((s, id) => s + (preferredPos.get(id) ?? 0), 0) / (ids.length || 1);
    let pos = avgPP - totalSize / 2;
    for (const id of ids) {
      const sz = nodeSizes.get(id) ?? 0;
      rankPositions.set(id, { x: 0, y: pos + sz / 2 });
      pos += sz;
      if (!dummyIds.has(id)) pos += NODE_GAP;
    }
  }

  // Top-down pass: position each rank based on upstream barycenter
  for (const rank of sortedRanks) {
    const ids = rankGroups.get(rank)!;
    const preferredPos = new Map<string, number>();

    if (rank === 0) {
      // Rank 0: sort alphabetically, centered at 0
      ids.sort((a, b) => {
        const sa = (nodeById.get(a)?.data as ContractTableNodeData)?.slug || "";
        const sb = (nodeById.get(b)?.data as ContractTableNodeData)?.slug || "";
        return sa.localeCompare(sb);
      });
      for (const id of ids) preferredPos.set(id, 0);
    } else {
      for (const id of ids) {
        const upstream = upstreamByRank.get(id) ?? [];
        if (upstream.length === 0) { preferredPos.set(id, 0); continue; }
        let sum = 0, count = 0;
        for (const nb of upstream) {
          const pos = rankPositions.get(nb);
          if (pos) { sum += pos.y; count++; }
        }
        preferredPos.set(id, count > 0 ? sum / count : 0);
      }
    }

    stackRank(ids, preferredPos);
  }

  // Bottom-up pass: reorder by downstream barycenter
  for (let i = sortedRanks.length - 2; i >= 0; i--) {
    const rank = sortedRanks[i];
    const ids = rankGroups.get(rank)!;
    const preferredPos = new Map<string, number>();

    for (const id of ids) {
      const downstream = downstreamByRank.get(id) ?? [];
      if (downstream.length === 0) {
        const current = rankPositions.get(id);
        preferredPos.set(id, current?.y ?? 0);
        continue;
      }
      let sum = 0, count = 0;
      for (const nb of downstream) {
        const pos = rankPositions.get(nb);
        if (pos) { sum += pos.y; count++; }
      }
      preferredPos.set(id, count > 0 ? sum / count : 0);
    }

    stackRank(ids, preferredPos);
  }

  // Center the whole graph on the stacking axis
  const allStackPos = Array.from(rankPositions.values()).map((p) => p.y);
  const centerStack = (Math.min(...allStackPos) + Math.max(...allStackPos)) / 2;

  // Assign final positions based on direction
  const laidOut = new Map<string, Node>();
  for (const node of connected) {
    const rp = rankPositions.get(node.id);
    if (!rp) continue;
    const rank = nodeRanks.get(node.id) ?? 0;
    const h = heights.get(node.id) ?? 0;
    const w = nodeWidth(node);
    const x = isLR ? rank * COLUMN_WIDTH : rp.y - centerStack;
    const yPos = isLR ? rp.y - centerStack : rank * COLUMN_WIDTH;
    laidOut.set(node.id, {
      ...node,
      position: { x: x - w / 2, y: yPos - h / 2 },
    });
  }

  // ── Collision detection: push apart any overlapping nodes ──
  const nodeArr = Array.from(laidOut.values());
  for (let iter = 0; iter < 10; iter++) {
    let hasOverlap = false;
    for (let i = 0; i < nodeArr.length; i++) {
      for (let j = i + 1; j < nodeArr.length; j++) {
        const a = nodeArr[i], b = nodeArr[j];
        const aw = nodeWidth(a), ah = heights.get(a.id) ?? 0;
        const bw = nodeWidth(b), bh = heights.get(b.id) ?? 0;
        const aRight = a.position.x + aw, aBottom = a.position.y + ah;
        const bRight = b.position.x + bw, bBottom = b.position.y + bh;
        if (a.position.x < bRight && aRight > b.position.x && a.position.y < bBottom && aBottom > b.position.y) {
          hasOverlap = true;
          const overlapX = Math.min(aRight - b.position.x, bRight - a.position.x);
          const overlapY = Math.min(aBottom - b.position.y, bBottom - a.position.y);
          if (overlapX < overlapY) {
            const shift = overlapX / 2 + 1;
            if (a.position.x < b.position.x) { a.position = { ...a.position, x: a.position.x - shift }; b.position = { ...b.position, x: b.position.x + shift }; }
            else { a.position = { ...a.position, x: a.position.x + shift }; b.position = { ...b.position, x: b.position.x - shift }; }
          } else {
            const shift = overlapY / 2 + 1;
            if (a.position.y < b.position.y) { a.position = { ...a.position, y: a.position.y - shift }; b.position = { ...b.position, y: b.position.y + shift }; }
            else { a.position = { ...a.position, y: a.position.y + shift }; b.position = { ...b.position, y: b.position.y - shift }; }
          }
        }
      }
    }
    if (!hasOverlap) break;
  }

  // ── Isolated nodes: grid to the left (LR) or above (TB) ──
  if (isolated.length > 0) {
    const gap = 20;
    const isoHeights = new Map<string, number>();
    for (const n of isolated) isoHeights.set(n.id, nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id)));
    const { positions, gridWidth } = layoutOrphanGrid(isolated, isoHeights, gap);
    let gridPos: { x: number; y: number };
    if (connected.length > 0) {
      if (isLR) {
        gridPos = { x: Math.min(...Array.from(laidOut.values()).map((n) => n.position.x)) - gridWidth - 80, y: 0 };
      } else {
        gridPos = { x: 0, y: Math.min(...Array.from(laidOut.values()).map((n) => n.position.y)) - gridWidth - 80 };
      }
    } else {
      gridPos = { x: 0, y: 0 };
    }
    for (const [id, pos] of positions) {
      const node = nodeById.get(id);
      if (!node) continue;
      laidOut.set(id, { ...node, position: { x: pos.x + gridPos.x, y: pos.y + gridPos.y } });
    }
  }

  return { nodes: nodes.map((n) => laidOut.get(n.id) || n), edges };
}


export function layoutLayerGraph(nodes: Node[], edges: Edge[], connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", collapsedTables?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const LAYER_ORDER = ["bronze", "silver", "gold"];
  const LAYER_GAP = 80;
  const VERTICAL_GAP = 30;

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

  // Compute per-layer max width for dynamic column sizing
  const layerMaxW = new Map<string, number>();
  for (const layer of LAYER_ORDER) {
    const ns = byLayer.get(layer);
    if (!ns || ns.length === 0) continue;
    let maxW = 0;
    for (const n of ns) maxW = Math.max(maxW, nodeWidth(n));
    layerMaxW.set(layer, maxW);
  }

  // Compute cumulative x offsets per layer (centered columns)
  const layerX = new Map<string, number>();
  let cursorX = 0;
  for (const layer of LAYER_ORDER) {
    const w = layerMaxW.get(layer) ?? NODE_WIDTH;
    layerX.set(layer, cursorX + w / 2);
    cursorX += w + LAYER_GAP;
  }
  const totalWidth = cursorX - LAYER_GAP;

  for (let colIdx = 0; colIdx < LAYER_ORDER.length; colIdx++) {
    const ns = byLayer.get(LAYER_ORDER[colIdx]);
    if (!ns) continue;

    ns.sort((a, b) => {
      const sa = (a.data as ContractTableNodeData).slug || "";
      const sb = (b.data as ContractTableNodeData).slug || "";
      return sa.localeCompare(sb);
    });

    let totalHeight = 0;
    for (const n of ns) totalHeight += heights.get(n.id) ?? 0;
    totalHeight += (ns.length - 1) * VERTICAL_GAP;

    let y = -totalHeight / 2;
    const x = (layerX.get(LAYER_ORDER[colIdx]) ?? 0) - totalWidth / 2;

    for (const n of ns) {
      const h = heights.get(n.id) ?? 0;
      positions.set(n.id, { x, y: y + h / 2 });
      y += h + VERTICAL_GAP;
    }
  }

  // --- Layout orphan tables in a grid to the right ---
  if (orphans.length > 0) {
    const orphanGap = 30;
    const { positions: orphanPositions, gridWidth } = layoutOrphanGrid(orphans, heights, orphanGap);
    const gridLeft = (connected.length > 0 ? cursorX + orphanGap : 0);
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
    const cx = layerX.get(layer) ?? 0;
    const bw = maxW + pad * 2;
    const bh = maxY - minY + pad * 2;

    bgNodes.push({
      id: `__bg_${layer}`,
      type: "layerBackground",
      position: { x: cx - bw / 2, y: (minY + maxY) / 2 - bh / 2 },
      data: { label: layer, width: bw, height: bh },
      draggable: false,
      selectable: false,
      style: { width: bw, height: bh, zIndex: -1 },
    });
  }

  const laidOut = nodes.map((n) => {
    const pos = positions.get(n.id);
    if (!pos) return n;
    const w = nodeWidth(n);
    return { ...n, position: { x: pos.x - w / 2, y: pos.y } };
  });

  // ── Collision detection for layer layout ──
  for (let iter = 0; iter < 10; iter++) {
    let hasOverlap = false;
    for (let i = 0; i < laidOut.length; i++) {
      for (let j = i + 1; j < laidOut.length; j++) {
        const a = laidOut[i], b = laidOut[j];
        if (!positions.has(a.id) || !positions.has(b.id)) continue;
        const aw = nodeWidth(a), ah = heights.get(a.id) ?? 0;
        const bw = nodeWidth(b), bh = heights.get(b.id) ?? 0;
        const aR = a.position.x + aw, aB = a.position.y + ah;
        const bR = b.position.x + bw, bB = b.position.y + bh;
        if (a.position.x < bR && aR > b.position.x && a.position.y < bB && aB > b.position.y) {
          hasOverlap = true;
          const ox = Math.min(aR - b.position.x, bR - a.position.x);
          const oy = Math.min(aB - b.position.y, bB - a.position.y);
          if (ox < oy) {
            const s = ox / 2 + 1;
            if (a.position.x < b.position.x) { a.position = { ...a.position, x: a.position.x - s }; b.position = { ...b.position, x: b.position.x + s }; }
            else { a.position = { ...a.position, x: a.position.x + s }; b.position = { ...b.position, x: b.position.x - s }; }
          } else {
            const s = oy / 2 + 1;
            if (a.position.y < b.position.y) { a.position = { ...a.position, y: a.position.y - s }; b.position = { ...b.position, y: b.position.y + s }; }
            else { a.position = { ...a.position, y: a.position.y + s }; b.position = { ...b.position, y: b.position.y - s }; }
          }
        }
      }
    }
    if (!hasOverlap) break;
  }

  return { nodes: [...bgNodes, ...laidOut], edges };
}

export function layoutStarGraph(nodes: Node[], edges: Edge[], connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", collapsedTables?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // Build undirected adjacency
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }

  const degree = new Map<string, number>();
  for (const [id, nb] of adj) degree.set(id, nb.size);

  const heights = new Map<string, number>();
  for (const n of nodes) heights.set(n.id, nodeHeight(n, connectedFields, viewMode, collapsedTables?.has(n.id)));

  // Separate orphans from connected components
  const orphanNodes = nodes.filter((n) => (adj.get(n.id)?.size ?? 0) === 0);

  const visited = new Set<string>();
  const components: string[][] = [];
  for (const n of nodes) {
    if ((adj.get(n.id)?.size ?? 0) === 0) continue;
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
  const isDetailed = viewMode === "detailed";
  const BASE_RADIUS = isDetailed ? 200 : 80;
  const RADIUS_STEP = isDetailed ? 280 : 130;
  const ORPHAN_BLOCK_GAP = 60;
  const COMP_GAP = isDetailed ? 200 : 80;

  // ── Orphan block: grid to the left ──
  let orphanBlockWidth = 0;
  if (orphanNodes.length > 0) {
    const sorted = orphanNodes.slice().sort((a, b) => {
      const sa = (a.data as ContractTableNodeData).slug || "";
      const sb = (b.data as ContractTableNodeData).slug || "";
      return sa.localeCompare(sb);
    });
    const { positions: oPos, gridWidth } = layoutOrphanGrid(sorted, heights, 20);
    orphanBlockWidth = gridWidth;
    for (const [id, pos] of oPos) {
      positions.set(id, { x: pos.x - gridWidth / 2, y: pos.y });
    }
  }

  // ── Connected components left-to-right ──
  let compX = orphanNodes.length > 0 ? orphanBlockWidth / 2 + ORPHAN_BLOCK_GAP : 0;

  for (let ci = 0; ci < components.length; ci++) {
    const comp = components[ci];
    if (comp.length === 0) continue;

    let center = comp[0];
    for (const id of comp) { if ((degree.get(id) ?? 0) > (degree.get(center) ?? 0)) center = id; }

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

    const byLayer = new Map<number, string[]>();
    for (const id of comp) {
      const l = layer.get(id) ?? 0;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l)?.push(id);
    }

    const radii = new Map<number, number>();
    let compMaxR = 0;
    for (const [l, ids] of byLayer) {
      const n = ids.length;
      const maxW = Math.max(...ids.map((id) => { const node = nodeById.get(id); return node ? nodeWidth(node) : NODE_WIDTH; }), NODE_WIDTH);
      const maxH = Math.max(...ids.map((id) => heights.get(id) ?? 90), 90);
      const minRWidth = (n * (maxW + 60)) / (2 * Math.PI);
      const minRHeight = maxH / 2 + 40;
      const r = Math.max(BASE_RADIUS + l * RADIUS_STEP, minRWidth, minRHeight);
      radii.set(l, r);
      if (r > compMaxR) compMaxR = r;
    }

    for (const [l, ids] of byLayer) {
      const radius = l === 0 ? 0 : radii.get(l)!;
      const n = ids.length;
      for (let i = 0; i < n; i++) {
        const angle = l === 0 ? 0 : (i / n) * Math.PI * 2 - Math.PI / 2;
        positions.set(ids[i], {
          x: compX + radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      }
    }

    compX += compMaxR * 2 + COMP_GAP;
  }


  const laidOut = nodes.map((n) => {
    const pos = positions.get(n.id);
    if (!pos) return n;
    const h = heights.get(n.id) ?? 0;
    const w = nodeWidth(n);
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });

  // ── Collision detection for star layout ──
  for (let iter = 0; iter < 10; iter++) {
    let hasOverlap = false;
    for (let i = 0; i < laidOut.length; i++) {
      for (let j = i + 1; j < laidOut.length; j++) {
        const a = laidOut[i], b = laidOut[j];
        const aw = nodeWidth(a), ah = heights.get(a.id) ?? 0;
        const bw = nodeWidth(b), bh = heights.get(b.id) ?? 0;
        const aR = a.position.x + aw, aB = a.position.y + ah;
        const bR = b.position.x + bw, bB = b.position.y + bh;
        if (a.position.x < bR && aR > b.position.x && a.position.y < bB && aB > b.position.y) {
          hasOverlap = true;
          const ox = Math.min(aR - b.position.x, bR - a.position.x);
          const oy = Math.min(aB - b.position.y, bB - a.position.y);
          if (ox < oy) {
            const s = ox / 2 + 1;
            if (a.position.x < b.position.x) { a.position = { ...a.position, x: a.position.x - s }; b.position = { ...b.position, x: b.position.x + s }; }
            else { a.position = { ...a.position, x: a.position.x + s }; b.position = { ...b.position, x: b.position.x - s }; }
          } else {
            const s = oy / 2 + 1;
            if (a.position.y < b.position.y) { a.position = { ...a.position, y: a.position.y - s }; b.position = { ...b.position, y: b.position.y + s }; }
            else { a.position = { ...a.position, y: a.position.y + s }; b.position = { ...b.position, y: b.position.y - s }; }
          }
        }
      }
    }
    if (!hasOverlap) break;
  }

  return { nodes: laidOut, edges };
}

export function layoutByMode(nodes: Node[], edges: Edge[], mode: LayoutMode, connectedFields?: Map<string, Map<string, number>>, viewMode?: "detailed" | "compact", containerWidth?: number, collapsedTables?: Set<string>): { nodes: Node[]; edges: Edge[] } {
  switch (mode) {
    case "LR":
    case "TB":
      return layoutGraph(nodes, edges, mode, connectedFields, viewMode, containerWidth, 30, collapsedTables);
    case "layer":
      return layoutLayerGraph(nodes, edges, connectedFields, viewMode, collapsedTables);
    case "star":
      return layoutStarGraph(nodes, edges, connectedFields, viewMode, collapsedTables);
  }
}
