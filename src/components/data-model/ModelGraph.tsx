"use client";

import { createContext, useContext, useMemo, useCallback, useState, useEffect, useLayoutEffect, useRef } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ContractTableNode } from "./ContractTableNode";
import { RelationEdge } from "./RelationEdge";
import { GraphControls } from "./GraphControls";
import type { LayoutMode, ContractTableNodeData } from "@/src/lib/data-model";

const nodeTypes = { contractTable: ContractTableNode };
const edgeTypes = { relationEdge: RelationEdge };

type ViewModeValue = {
  viewMode: "detailed" | "compact";
  connectedFields: Map<string, Set<string>>;
  onHeaderClick: (slug: string) => void;
  onFieldClick: (slug: string) => void;
  highlightedNode: string | null;
  highlightedNeighbors: Set<string> | null;
  searchMatchIds: Set<string> | null;
};

export const ViewModeCtx = createContext<ViewModeValue>({
  viewMode: "detailed",
  connectedFields: new Map(),
  onHeaderClick: () => {},
  onFieldClick: () => {},
  highlightedNode: null,
  highlightedNeighbors: null,
  searchMatchIds: null,
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
  searchQuery,
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
  searchQuery?: string;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const { setCenter, fitView } = useReactFlow();
  const fitKeyRef = useRef(0);
  const centerKeyRef = useRef(0);

  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  // Sync layout changes + apply current visibility — loses drag positions
  useLayoutEffect(() => {
    setNodes(initialNodes.map((n) => ({
      ...n,
      hidden: !visibleTables.has(n.id),
    })));
  }, [initialNodes, setNodes]);

  // Toggle visibility — preserves dragged positions (uses callback form)
  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, hidden: !visibleTables.has(n.id) })));
  }, [initialNodes, visibleTables, setNodes]);

  const handleMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    setHighlightedNode(node.id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlightedNode(null);
  }, []);

  // Precompute neighbor set when highlightedNode changes — O(E) once instead of O(E) per node
  const highlightedNeighbors = useMemo(() => {
    if (!highlightedNode) return null;
    const nbors = new Set<string>();
    for (const e of edges) {
      if (e.source === highlightedNode) nbors.add(e.target);
      if (e.target === highlightedNode) nbors.add(e.source);
    }
    return nbors;
  }, [highlightedNode, edges]);

  // Compute search-matching node IDs
  const searchMatchIds = useMemo(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    return new Set(
      initialNodes
        .filter((n) => {
          const d = n.data as ContractTableNodeData;
          const label = d.label?.toLowerCase() || "";
          const slug = d.slug?.toLowerCase() || "";
          const domain = d.domain?.toLowerCase() || "";
          const context = d.context?.toLowerCase() || "";
          return label.includes(q) || slug.includes(q) || domain.includes(q) || context.includes(q);
        })
        .map((n) => n.id),
    );
  }, [searchQuery, initialNodes]);

  // Update opacity when highlight or search changes
  useEffect(() => {
    if (searchMatchIds && searchMatchIds.size > 0) {
      setNodes((nds) => nds.map((n) => {
        const isMatch = searchMatchIds.has(n.id);
        const hasSearchRing = n.className?.includes("search-match");
        const newClassName = isMatch ? "search-match" : undefined;
        if (!isMatch) {
          return {
            ...n,
            style: { ...n.style, opacity: 0.3 },
            className: n.className?.replace("search-match", "").trim() || undefined,
          };
        }
        return {
          ...n,
          style: { ...n.style, opacity: 1 },
          className: newClassName,
        };
      }));
    } else if (!highlightedNeighbors) {
      setNodes((nds) => nds.map((n) => {
        if (!n.style?.opacity || n.style.opacity === 1) return n;
        const { opacity: _, ...rest } = n.style;
        const cls = n.className?.replace("search-match", "").trim() || undefined;
        return { ...n, style: Object.keys(rest).length ? rest : undefined, className: cls };
      }));
    } else {
      setNodes((nds) => nds.map((n) => ({
        ...n,
        style: { ...n.style, opacity: highlightedNode === n.id || highlightedNeighbors.has(n.id) ? 1 : 0.25 },
      })));
    }
  }, [highlightedNeighbors, highlightedNode, searchMatchIds, setNodes]);

  // Center on table from panel
  useEffect(() => {
    if (!centerSlug || centerKey <= centerKeyRef.current) return;
    centerKeyRef.current = centerKey;
    const node = nodes.find((n) => n.id === centerSlug);
    if (!node) return;
    setCenter(node.position.x + (node.measured?.width ?? 220) / 2, node.position.y + 20, { zoom: 1 });
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
    highlightedNode,
    highlightedNeighbors,
    searchMatchIds,
  }), [viewMode, connectedFields, onHeaderClick, onNodeClick, highlightedNode, highlightedNeighbors, searchMatchIds]);

  const filteredEdges = useMemo(
    () => edges.filter((e) => visibleTables.has(e.source) && visibleTables.has(e.target)),
    [edges, visibleTables],
  );

  return (
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
          {showGrid && <Background variant={BackgroundVariant.Lines} color="#e2e8f0" gap={20} size={0.5} />}
          <Panel position="bottom-center" className="!m-0" style={{ bottom: 12 }}>
            <GraphControls
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              layoutMode={layoutMode}
              onLayoutModeChange={onLayoutModeChange}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid((v) => !v)}
              onFitViewVisible={onFitViewVisible}
            />
          </Panel>
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            nodeStrokeColor="#94a3b8"
            nodeStrokeWidth={4}
            nodeBorderRadius={2}
            nodeColor={(n) => ((n.data as ContractTableNodeData)?.color) || "#94a3b8"}
            maskColor="rgba(0,0,0,0.1)"
            className="!rounded-lg !border !border-gray-200 !shadow-sm cursor-grab active:cursor-grabbing"
            style={{ bottom: 12, right: 12 }}
          />
        </ReactFlow>
      </div>
    </ViewModeCtx.Provider>
  );
}
