"use client";

import { createContext, useContext, useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
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
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  const { setCenter } = useReactFlow();

  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  // Center on focused table
  useEffect(() => {
    if (!focusedTable) return;
    const node = nodes.find((n) => n.id === focusedTable);
    if (!node) return;
    setCenter(node.position.x + (node.measured?.width ?? 220) / 2, node.position.y + (node.measured?.height ?? 100) / 2, { zoom: 1 });
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

  const nodeOpacity = useCallback(
    (node: Node) => {
      if (!highlightedNode) return 1;
      if (node.id === highlightedNode) return 1;
      const hasEdge = edges.some(
        (e) =>
          (e.source === highlightedNode && e.target === node.id) ||
          (e.target === highlightedNode && e.source === node.id),
      );
      return hasEdge ? 1 : 0.25;
    },
    [highlightedNode, edges],
  );

  const visibleNodes = useMemo(
    () => filteredNodes.map((n) => ({ ...n, style: { ...n.style, opacity: nodeOpacity(n) } })),
    [filteredNodes, nodeOpacity],
  );

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
          panOnScroll={true}
          panOnScrollMode={PanOnScrollMode.Free}
          zoomActivationKeyCode="Control"
        >
          <Background color="#f1f5f9" gap={16} />
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
            />
          </Panel>
        </ReactFlow>
      </div>
    </ViewModeCtx.Provider>
  );
}
