"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ContractTableNode } from "./ContractTableNode";
import { RelationEdge } from "./RelationEdge";
import { GraphControls } from "./GraphControls";
import type { LayoutDirection } from "@/src/lib/data-model";

const nodeTypes = { contractTable: ContractTableNode };
const edgeTypes = { relationEdge: RelationEdge };

export function ModelGraph({
  initialNodes,
  initialEdges,
  connectedFields,
  viewMode,
  visibleTables,
  direction,
  onViewModeChange,
  onDirectionChange,
  onNodeClick,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  connectedFields: Map<string, Set<string>>;
  viewMode: "detailed" | "compact";
  visibleTables: Set<string>;
  direction: LayoutDirection;
  onViewModeChange: (v: "detailed" | "compact") => void;
  onDirectionChange: (d: LayoutDirection) => void;
  onNodeClick: (slug: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, onHeaderClick: (slug: string) => onNodeClick(slug) },
      })),
    );
  }, [onNodeClick, setNodes]);

  // Compact mode: filter fields
  const displayNodes = useMemo(() => {
    return nodes.map((n) => {
      if (viewMode === "detailed") return n;
      const active = connectedFields.get(n.id);
      if (!active || active.size === 0) return n;
      const allFields = (n.data as { fields?: { name: string; type: string }[] })?.fields ?? [];
      const compactFields = allFields.filter((f) => active.has(f.name));
      return {
        ...n,
        data: { ...n.data, fields: compactFields.length > 0 ? compactFields : allFields },
      };
    });
  }, [nodes, viewMode, connectedFields]);

  // Filter by visibility
  const filteredNodes = useMemo(() => {
    return displayNodes.filter((n) => visibleTables.has(n.id));
  }, [displayNodes, visibleTables]);

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

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={filteredNodes.map((n) => ({
          ...n,
          style: { ...n.style, opacity: nodeOpacity(n) },
        }))}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={handleMouseEnter}
        onNodeMouseLeave={handleMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        nodesDraggable={true}
      >
        <Background color="#f1f5f9" gap={16} />
        <MiniMap
          nodeStrokeColor="#94a3b8"
          nodeColor={(n) => ((n.data as { color?: string })?.color) || "#94a3b8"}
          maskColor="rgba(0,0,0,0.1)"
          className="!rounded-lg !border !border-gray-200 !shadow-sm"
        />
      </ReactFlow>

      {/* Custom controls overlay */}
      <div className="absolute bottom-4 left-4 z-10">
        <GraphControls
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          direction={direction}
          onDirectionChange={onDirectionChange}
        />
      </div>
    </div>
  );
}
