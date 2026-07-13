"use client";

import { createContext, useMemo, useCallback, useState, useEffect, useLayoutEffect, useRef, memo } from "react";
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
  type Node,
  type Edge,
  type NodeProps,
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
  connectedFields: Map<string, Set<string>>;
  onHeaderClick: (slug: string) => void;
  onFieldClick: (slug: string) => void;
  searchMatchIds: Set<string> | null;
  collapsedTables: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
};

export const ViewModeCtx = createContext<ViewModeValue>({
  viewMode: "detailed",
  connectedFields: new Map(),
  onHeaderClick: () => {},
  onFieldClick: () => {},
  searchMatchIds: null,
  collapsedTables: new Set(),
  onToggleCollapse: () => {},
});

type HighlightValue = {
  highlightedNode: string | null;
  highlightedNeighbors: Set<string> | null;
};

export const HighlightCtx = createContext<HighlightValue>({
  highlightedNode: null,
  highlightedNeighbors: null,
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
  connectedFields: Map<string, Set<string>>;
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
  const [showGrid, setShowGrid] = useState(true);

  const { setCenter, fitView } = useReactFlow();
  const fitKeyRef = useRef(0);

  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  // Sync layout changes + apply current visibility — loses drag positions
  useLayoutEffect(() => {
    setNodes(initialNodes.map((n) => ({
      ...n,
      hidden: n.id.startsWith("__bg_") ? false : !visibleTables.has(n.id),
    })));
  }, [initialNodes, setNodes]);

  // Toggle visibility — preserves dragged positions (uses callback form)
  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, hidden: n.id.startsWith("__bg_") ? false : !visibleTables.has(n.id) })));
  }, [initialNodes, visibleTables, setNodes]);

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

  // Adjacency map built once when edges change — O(E) once, O(1) per lookup
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      map.get(e.source)!.add(e.target);
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.target)!.add(e.source);
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

  // Update opacity when search changes
  useEffect(() => {
    if (searchMatchSet && searchMatchSet.size > 0) {
      setNodes((nds) => nds.map((n) => ({
        ...n,
        style: n.id.startsWith("__bg_") ? n.style : { ...n.style, opacity: searchMatchSet.has(n.id) ? 1 : 0.3 },
        className: searchMatchSet.has(n.id) ? "search-match" : undefined,
      })));
    } else {
      setNodes((nds) => nds.map((n) => {
        if (!n.style?.opacity || n.style.opacity === 1) return n;
        const { opacity: _, ...rest } = n.style;
        return { ...n, style: Object.keys(rest).length ? rest : undefined, className: undefined };
      }));
    }
  }, [searchMatchSet, setNodes]);

  // Center on table — guard-ref prevents re-centering on drag or relayout
  const centerRef = useRef<{ key: number; slug: string | null } | null>(null);
  useEffect(() => {
    if (!centerSlug) return;
    const prev = centerRef.current;
    if (prev && centerKey <= prev.key && centerSlug === prev.slug) return;
    centerRef.current = { key: centerKey, slug: centerSlug };
    const node = nodes.find((n) => n.id === centerSlug);
    if (!node) return;
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

  const ctxValue = useMemo<ViewModeValue>(() => ({
    viewMode,
    connectedFields,
    onHeaderClick,
    onFieldClick: onNodeClick,
    searchMatchIds: searchMatchSet,
    collapsedTables,
    onToggleCollapse,
  }), [viewMode, connectedFields, onHeaderClick, onNodeClick, searchMatchSet, collapsedTables, onToggleCollapse]);

  const filteredEdges = useMemo(
    () => edges.filter((e) => visibleTables.has(e.source) && visibleTables.has(e.target)),
    [edges, visibleTables],
  );

  const highlightCtxValue = useMemo<HighlightValue>(() => ({
    highlightedNode,
    highlightedNeighbors,
  }), [highlightedNode, highlightedNeighbors]);

  return (
    <HighlightCtx.Provider value={highlightCtxValue}>
    <ViewModeCtx.Provider value={ctxValue}>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeMouseEnter={handleMouseEnter}
          onNodeMouseLeave={handleMouseLeave}
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
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700 shadow-sm" title={orphanRefs.join("\n")}>
                {orphanRefs.length} broken reference{orphanRefs.length !== 1 ? "s" : ""}
              </div>
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
    </ViewModeCtx.Provider>
    </HighlightCtx.Provider>
  );
}
