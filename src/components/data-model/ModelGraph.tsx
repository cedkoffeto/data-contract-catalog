"use client";

import { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";
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
import type { LayoutMode } from "@/src/lib/data-model";

const nodeTypes = { contractTable: ContractTableNode };
const edgeTypes = { relationEdge: RelationEdge };

type ViewModeValue = {
  viewMode: "detailed" | "compact";
  connectedFields: Map<string, Set<string>>;
  onHeaderClick: (slug: string) => void;
  onFieldClick: (slug: string) => void;
};

export const ViewModeCtx = createContext<ViewModeValue>({
  viewMode: "detailed",
  connectedFields: new Map(),
  onHeaderClick: () => {},
  onFieldClick: () => {},
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
  focusedTable,
  onFitViewVisible,
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
  focusedTable: string | null;
  onFitViewVisible: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const { setCenter } = useReactFlow();

  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  // Center on focused table
  useEffect(() => {
    if (!focusedTable) return;
    const node = nodes.find((n) => n.id === focusedTable);
    if (!node) return;
    setCenter(node.position.x + (node.measured?.width ?? 220) / 2, node.position.y + 20, { zoom: 1 });
  }, [focusedTable, nodes, setCenter]);



  const ctxValue = useMemo<ViewModeValue>(() => ({
    viewMode,
    connectedFields,
    onHeaderClick,
    onFieldClick: onNodeClick,
  }), [viewMode, connectedFields, onHeaderClick, onNodeClick]);

  // Filter by visibility
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => visibleTables.has(n.id));
  }, [nodes, visibleTables]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(
    () => edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)),
    [edges, filteredNodeIds],
  );

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

  const visibleNodes = useMemo(() => {
    return filteredNodes.map((n) => {
      let opacity = 1;
      if (highlightedNeighbors && highlightedNode !== n.id) {
        opacity = highlightedNeighbors.has(n.id) ? 1 : 0.25;
      }
      return { ...n, style: { ...n.style, opacity } };
    });
  }, [filteredNodes, highlightedNeighbors, highlightedNode]);

  return (
    <ViewModeCtx.Provider value={ctxValue}>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={visibleNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeMouseEnter={handleMouseEnter}
          onNodeMouseLeave={handleMouseLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
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
          {showGrid && <Background variant={BackgroundVariant.Lines} color="#e2e8f0" gap={32} size={1} />}
          <MiniMap
            pannable
            zoomable
            nodeStrokeColor="#94a3b8"
            nodeColor={(n) => ((n.data as { color?: string })?.color) || "#94a3b8"}
            maskColor="rgba(0,0,0,0.1)"
            className="!rounded-lg !border !border-gray-200 !shadow-sm cursor-grab active:cursor-grabbing"
            style={{ bottom: 16 }}
          />
          <Panel position="bottom-right" className="!m-0" style={{ bottom: 180, right: 12 }}>
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
        </ReactFlow>
      </div>
    </ViewModeCtx.Provider>
  );
}
