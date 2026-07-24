"use client";

import { createContext, useMemo, useCallback, useState, useEffect, useLayoutEffect, useRef, memo, useContext, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  PanOnScrollMode,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ContractTableNode } from "./ContractTableNode";
import { RelationEdge } from "./RelationEdge";
import { GraphControls } from "./GraphControls";
import type { LayoutMode, ContractTableNodeData } from "@/src/lib/data-model";

const layerColors: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)", text: "rgba(180,110,0,0.5)" },
  silver: { bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.25)", text: "rgba(71,85,105,0.5)" },
  gold:   { bg: "rgba(234,179,8,0.06)",  border: "rgba(234,179,8,0.25)",  text: "rgba(160,120,0,0.5)" },
};

function BrokenRefBadge({ orphanRefs }: { orphanRefs: string[] }) {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  return (
    <>
      <div
        className="relative inline-flex h-5 cursor-pointer items-center rounded-md bg-amber-50 border border-amber-200 px-3 text-xs text-amber-700 shadow-sm"
        onMouseEnter={(e) => { setHover(true); const r = e.currentTarget.getBoundingClientRect(); setPos({ top: r.bottom + 6, left: r.left }); }}
        onMouseLeave={() => { setHover(false); setPos(null); }}
      >
        {orphanRefs.length} broken reference{orphanRefs.length !== 1 ? "s" : ""}
      </div>
      {hover && pos && createPortal(
        <div className="editor-error-popover fixed" style={{ left: pos.left, top: pos.top }}>
          <div className="editor-error-popover-arrow" />
          <div className="editor-error-popover-header">
            <span>Broken references</span>
          </div>
          <div className="editor-error-popover-body">
            {orphanRefs.map((ref, i) => (
              <div key={i} className={i < orphanRefs.length - 1 ? "border-b border-gray-100 pb-2 mb-2" : ""}>
                <div className="text-[11px] font-semibold text-amber-600">{ref}</div>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

const LayerBackgroundNode = memo(function LayerBackgroundNode({ data }: NodeProps) {
  const d = data as { label: string; width: number; height: number };
  const c = layerColors[d.label] ?? layerColors.bronze;
  return (
    <div
      className="rounded-xl border-2 pointer-events-none select-none flex flex-col items-center"
      style={{ width: d.width, height: d.height, backgroundColor: c.bg, borderColor: c.border }}
    >
      <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: c.text }}>
        {d.label}
      </span>
    </div>
  );
});

const nodeTypes = { contractTable: ContractTableNode, layerBackground: LayerBackgroundNode };
const edgeTypes = { relationEdge: RelationEdge };

type ViewModeValue = {
  viewMode: "detailed" | "compact";
  connectedFields: Map<string, Map<string, number>>;
  onHeaderClick: (slug: string) => void;
  onFieldClick: (slug: string) => void;
  searchMatchIds: Set<string> | null;
  collapsedTables: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
  fieldIndexMap: Map<string, Map<string, number>>;
  nodesWithSummaryRow: Set<string>;
};

export const ViewModeCtx = createContext<ViewModeValue>({
  viewMode: "detailed",
  connectedFields: new Map(),
  onHeaderClick: () => {},
  onFieldClick: () => {},
  searchMatchIds: null,
  collapsedTables: new Set(),
  onToggleCollapse: () => {},
  fieldIndexMap: new Map(),
  nodesWithSummaryRow: new Set(),
});

export type FieldPosValue = {
  fieldPositions: Map<string, Map<string, number>>;
  nodeHeights: Map<string, number>;
  onFieldPositions: (nodeId: string, positions: Map<string, number>, height: number) => void;
  fieldPorts: Map<string, Map<string, Position>>;
};

export const FieldPosCtx = createContext<FieldPosValue>({
  fieldPositions: new Map(),
  nodeHeights: new Map(),
  onFieldPositions: () => {},
  fieldPorts: new Map(),
});

export type EdgeRenderData = {
  path: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  parallelOffset: number;
  targetParallelOffset: number;
  cardSource: string;
  cardTarget: string;
  label: string;
};

type HighlightValue = {
  highlightedNode: string | null;
  highlightedNeighbors: Set<string> | null;
  selectedEdge: string | null;
  hoveredEdgeId: string | null;
  onHoveredEdgeChange: (id: string | null) => void;
  edgeRenderDataRef: React.RefObject<Map<string, EdgeRenderData>>;
  nodeMap: Map<string, Node>;
};

export const HighlightCtx = createContext<HighlightValue>({
  highlightedNode: null,
  highlightedNeighbors: null,
  selectedEdge: null,
  hoveredEdgeId: null,
  onHoveredEdgeChange: () => {},
  edgeRenderDataRef: { current: new Map() },
  nodeMap: new Map(),
});

export function ModelGraph({
  initialNodes,
  initialEdges,
  connectedFields,
  viewMode,
  visibleTables,
  layoutMode,
  onViewModeChange,
  onLayoutModeChange,
  onNodeClick,
  onHeaderClick,
  onFitViewVisible,
  fitKey,
  centerSlug,
  centerKey,
  searchMatchIds,
  visibleCount,
  totalCount,
  orphanRefs,
  collapsedTables,
  onToggleCollapse,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  connectedFields: Map<string, Map<string, number>>;
  viewMode: "detailed" | "compact";
  visibleTables: Set<string>;
  layoutMode: LayoutMode;
  onViewModeChange: (v: "detailed" | "compact") => void;
  onLayoutModeChange: (d: LayoutMode) => void;
  onNodeClick: (slug: string) => void;
  onHeaderClick: (slug: string) => void;
  onFitViewVisible: () => void;
  fitKey: number;
  centerSlug: string | null;
  centerKey: number;
  searchMatchIds: string[] | null;
  visibleCount: number;
  totalCount: number;
  orphanRefs?: string[];
  collapsedTables: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const edgeClickGuardRef = useRef(false);
  const edgeRenderDataRef = useRef(new Map<string, EdgeRenderData>());
  const [showGrid, setShowGrid] = useState(true);
  const [fieldPositions, setFieldPositions] = useState<Map<string, Map<string, number>>>(new Map());
  const [nodeHeights, setNodeHeights] = useState<Map<string, number>>(new Map());

  const handleFieldPositions = useCallback((nodeId: string, positions: Map<string, number>, height: number) => {
    setFieldPositions((prev) => {
      const existing = prev.get(nodeId);
      if (existing && existing.size === positions.size && [...positions.entries()].every(([k, v]) => existing.get(k) === v)) return prev;
      const next = new Map(prev);
      next.set(nodeId, new Map(positions));
      return next;
    });
    setNodeHeights((prev) => {
      if (prev.get(nodeId) === height) return prev;
      const next = new Map(prev);
      next.set(nodeId, height);
      return next;
    });
  }, []);

  const { setCenter, fitView } = useReactFlow();
  const fitKeyRef = useRef(0);

  // Intercept resize events to persist _customWidth in node data
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === "dimensions" && change.dimensions) {
        const newWidth = change.dimensions.width;
        setNodes((nds) => nds.map((n) => {
          if (n.id !== change.id) return n;
          if ((n.data as Record<string, unknown>)?._customWidth === newWidth) return n;
          return { ...n, data: { ...n.data, _customWidth: newWidth } };
        }));
      }
    }
    onNodesChange(changes);
  }, [onNodesChange, setNodes]);

  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  // Elevate connected edges above nodes when hovering a table or an edge
  useEffect(() => {
    setEdges((eds) => eds.map((e) => {
      const isConnected = highlightedNode && (e.source === highlightedNode || e.target === highlightedNode);
      const isHovered = hoveredEdgeId === e.id;
      const elevated = isConnected || isHovered;
      const z = elevated ? 20 : 0;
      return e.zIndex === z ? e : { ...e, zIndex: z };
    }));
  }, [highlightedNode, hoveredEdgeId, setEdges]);

  // Sync layout changes + apply current visibility
  // Only replaces node objects whose reference actually changed from previous initialNodes —
  // unchanged nodes keep their existing React Flow entry (preserves drag positions).
  const prevInitNodesRef = useRef(initialNodes);
  useLayoutEffect(() => {
    const prevNodes = prevInitNodesRef.current;
    prevInitNodesRef.current = initialNodes;
    if (prevNodes === initialNodes) return;
    setNodes((nds) => {
      const prevMap = new Map(prevNodes.map((n) => [n.id, n]));
      const ndsMap = new Map(nds.map((n) => [n.id, n]));
      let changed = false;
      const next = initialNodes.map((n) => {
        const prev = prevMap.get(n.id);
        if (prev === n) {
          return ndsMap.get(n.id) ?? n;
        }
        changed = true;
        const shouldHide = n.id.startsWith("__bg_") ? false : !visibleTables.has(n.id);
        return { ...n, hidden: shouldHide };
      });
      return changed ? next : nds;
    });
  }, [initialNodes, setNodes, visibleTables]);

  // Toggle visibility — preserves dragged positions (uses callback form)
  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      const shouldHide = n.id.startsWith("__bg_") ? false : !visibleTables.has(n.id);
      return n.hidden === shouldHide ? n : { ...n, hidden: shouldHide };
    }));
  }, [visibleTables, setNodes]);

  // Sync collapse state into node data so React Flow re-renders ContractTableNode
  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      const collapsed = collapsedTables.has(n.id);
      if ((n.data as Record<string, unknown>)?._collapsed === collapsed) return n;
      return { ...n, data: { ...n.data, _collapsed: collapsed } };
    }));
  }, [collapsedTables, setNodes]);

  const handleMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    setHighlightedNode(node.id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlightedNode(null);
  }, []);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    edgeClickGuardRef.current = true;
    setSelectedEdge(edge.id);
    requestAnimationFrame(() => { edgeClickGuardRef.current = false; });
  }, []);

  const handlePaneClick = useCallback(() => {
    if (edgeClickGuardRef.current) return;
    setSelectedEdge(null);
  }, []);

  const handleHoveredEdgeChange = useCallback((id: string | null) => {
    setHoveredEdgeId(id);
  }, []);

  // Adjacency map built once when edges change — O(E) once, O(1) per lookup
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      map.get(e.source)?.add(e.target);
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.target)?.add(e.source);
    }
    return map;
  }, [edges]);

  const highlightedNeighbors = useMemo(() => {
    if (!highlightedNode) return null;
    return adjacencyMap.get(highlightedNode) ?? null;
  }, [highlightedNode, adjacencyMap]);

  // Compute search-matching node IDs from prop
  const searchMatchSet = useMemo(
    () => (searchMatchIds ? new Set(searchMatchIds) : null),
    [searchMatchIds],
  );

  // Update highlight when search changes
  useEffect(() => {
    if (searchMatchSet && searchMatchSet.size > 0) {
      setNodes((nds) => nds.map((n) => {
        const shouldMatch = searchMatchSet.has(n.id);
        const className = shouldMatch ? "search-match" : undefined;
        return n.className === className ? n : { ...n, className };
      }));
    } else {
      setNodes((nds) => nds.map((n) => {
        if (!n.className) return n;
        return { ...n, className: undefined };
      }));
    }
  }, [searchMatchSet, setNodes]);

  // Center on table — guard-ref prevents re-centering on drag or relayout
  const centerRef = useRef<{ key: number; slug: string | null } | null>(null);
  useEffect(() => {
    if (!centerSlug) return;
    const prev = centerRef.current;
    if (prev && centerKey <= prev.key && centerSlug === prev.slug) return;
    const node = nodes.find((n) => n.id === centerSlug);
    if (!node) return;
    centerRef.current = { key: centerKey, slug: centerSlug };
    const x = node.position.x + (node.measured?.width ?? 220) / 2;
    const y = node.position.y + 20;
    requestAnimationFrame(() => setCenter(x, y, { zoom: 1 }));
  }, [centerSlug, centerKey, nodes, setCenter]);

  // Fit view after re-layout — ref-guarded so it only fires once per fitKey increment
  useLayoutEffect(() => {
    if (fitKey > fitKeyRef.current) {
      fitKeyRef.current = fitKey;
      const hasVisible = visibleTables.size > 0;
      requestAnimationFrame(() => {
        if (hasVisible) fitView({ padding: 0.2, includeHiddenNodes: false });
      });
    }
  }, [fitKey, fitView, visibleTables]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const fieldIndexMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const node of nodes) {
      const allFields = (node.data as ContractTableNodeData).fields;
      if (!allFields) { map.set(node.id, new Map()); continue; }
      const collapsed = collapsedTables.has(node.id);
      const showingDetailed = viewMode === "detailed" ? !collapsed : collapsed;
      const fieldMap = new Map<string, number>();
      if (showingDetailed) {
        allFields.forEach((f, i) => fieldMap.set(f.name, i));
      } else {
        const nodeConnected = connectedFields.get(node.id);
        let idx = 0;
        for (const f of allFields) {
          if ((nodeConnected?.get(f.name) ?? 0) > 0) fieldMap.set(f.name, idx++);
        }
      }
      map.set(node.id, fieldMap);
    }
    return map;
  }, [nodes, collapsedTables, viewMode, connectedFields]);

  // Field-level port assignment: each field gets a side (Left or Right)
  // to minimize S-shapes and edge crossings
  const fieldPorts = useMemo(() => {
    const ports = new Map<string, Map<string, Position>>();
    for (const node of nodes) {
      const nodeX = node.position.x + (node.measured?.width ?? 220) / 2;
      // Collect field directions from all edges
      const fieldDir = new Map<string, { right: number; left: number }>();
      for (const edge of edges) {
        let fieldName: string | undefined;
        let otherX: number | undefined;
        if (edge.source === node.id) {
          fieldName = edge.sourceHandle ?? undefined;
          const other = nodeMap.get(edge.target);
          if (other) otherX = other.position.x + (other.measured?.width ?? 220) / 2;
        } else if (edge.target === node.id) {
          fieldName = edge.targetHandle ?? undefined;
          const other = nodeMap.get(edge.source);
          if (other) otherX = other.position.x + (other.measured?.width ?? 220) / 2;
        }
        if (fieldName === undefined || otherX === undefined) continue;
        if (!fieldDir.has(fieldName)) fieldDir.set(fieldName, { right: 0, left: 0 });
        const dir = fieldDir.get(fieldName)!;
        if (otherX > nodeX) dir.right++;
        else dir.left++;
      }

      const fieldMap = new Map<string, Position>();
      // Sort fields: majority-direction first, then alternate within each group
      const entries = Array.from(fieldDir.entries());
      entries.sort((a, b) => {
        const aRight = a[1].right - a[1].left;
        const bRight = b[1].right - b[1].left;
        return bRight - aRight;
      });

      let rightCount = 0;
      let leftCount = 0;
      for (const [fieldName, dir] of entries) {
        const preferRight = dir.right >= dir.left;
        if (preferRight) {
          fieldMap.set(fieldName, rightCount % 2 === 0 ? Position.Right : Position.Left);
          rightCount++;
        } else {
          fieldMap.set(fieldName, leftCount % 2 === 0 ? Position.Left : Position.Right);
          leftCount++;
        }
      }
      ports.set(node.id, fieldMap);
    }
    return ports;
  }, [nodes, edges, nodeMap]);

  const nodesWithSummaryRow = useMemo(() => {
    const set = new Set<string>();
    for (const node of nodes) {
      const allFields = (node.data as ContractTableNodeData).fields;
      const collapsed = collapsedTables.has(node.id);
      const showingDetailed = viewMode === "detailed" ? !collapsed : collapsed;
      if (showingDetailed) continue;
      const nodeConnected = connectedFields.get(node.id);
      const visibleCount = allFields.filter((f) => (nodeConnected?.get(f.name) ?? 0) > 0).length;
      if (allFields.length > visibleCount) set.add(node.id);
    }
    return set;
  }, [nodes, collapsedTables, viewMode, connectedFields]);

  const filteredEdges = useMemo(
    () => edges.filter((e) => visibleTables.has(e.source) && visibleTables.has(e.target)),
    [edges, visibleTables],
  );

  const ctxValue = useMemo<ViewModeValue>(() => ({
    viewMode,
    connectedFields,
    onHeaderClick,
    onFieldClick: onNodeClick,
    searchMatchIds: searchMatchSet,
    collapsedTables,
    onToggleCollapse,
    fieldIndexMap,
    nodesWithSummaryRow,
  }), [viewMode, connectedFields, onHeaderClick, onNodeClick, searchMatchSet, collapsedTables, onToggleCollapse, fieldIndexMap, nodesWithSummaryRow]);

  const highlightCtxValue = useMemo<HighlightValue>(() => ({
    highlightedNode,
    highlightedNeighbors,
    selectedEdge,
    hoveredEdgeId,
    onHoveredEdgeChange: handleHoveredEdgeChange,
    edgeRenderDataRef,
    nodeMap,
  }), [highlightedNode, highlightedNeighbors, selectedEdge, hoveredEdgeId, handleHoveredEdgeChange, nodeMap]);

  const fieldPosCtxValue = useMemo<FieldPosValue>(() => ({
    fieldPositions,
    nodeHeights,
    onFieldPositions: handleFieldPositions,
    fieldPorts,
  }), [fieldPositions, nodeHeights, handleFieldPositions, fieldPorts]);

  return (
    <HighlightCtx.Provider value={highlightCtxValue}>
    <ViewModeCtx.Provider value={ctxValue}>
    <FieldPosCtx.Provider value={fieldPosCtxValue}>
      <div className="data-model-graph relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={filteredEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeMouseEnter={handleMouseEnter}
          onNodeMouseLeave={handleMouseLeave}
          onEdgeClick={handleEdgeClick}
          onClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          proOptions={{ hideAttribution: true }}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
          nodesDraggable={true}
          nodesConnectable={false}
          onlyRenderVisibleElements={true}
          nodeDragThreshold={1}
          panOnScroll={true}
          panOnScrollMode={PanOnScrollMode.Free}
          zoomActivationKeyCode="Control"
        >
          {showGrid && <Background variant={BackgroundVariant.Lines} color="#e2e8f0" gap={10} size={0.5} />}
          <Panel position="bottom-center" className="!m-0" style={{ bottom: 12 }}>
            <GraphControls
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              layoutMode={layoutMode}
              onLayoutModeChange={onLayoutModeChange}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid((v) => !v)}
              onFitViewVisible={onFitViewVisible}
              visibleCount={visibleCount}
              totalCount={totalCount}
            />
          </Panel>
          {orphanRefs && orphanRefs.length > 0 ? (
            <Panel position="top-right" className="!m-0" style={{ top: 12, right: 12 }}>
              <BrokenRefBadge orphanRefs={orphanRefs} />
            </Panel>
          ) : null}
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeColor={(n) => {
              if (n.hidden) return "#e2e8f0";
              return ((n.data as ContractTableNodeData)?.color) || "#94a3b8";
            }}
            nodeStrokeColor={(n) => {
              if (n.hidden) return "#f1f5f9";
              return ((n.data as ContractTableNodeData)?.color) || "#64748b";
            }}
            nodeStrokeWidth={3}
            nodeBorderRadius={3}
            maskColor="rgba(0,0,0,0.08)"
            className="!rounded-lg !border !border-gray-200 !shadow-sm cursor-grab active:cursor-grabbing"
            style={{ bottom: 12, right: 12 }}
          />
        </ReactFlow>
      </div>
    </FieldPosCtx.Provider>
    </ViewModeCtx.Provider>
    </HighlightCtx.Provider>
  );
}
