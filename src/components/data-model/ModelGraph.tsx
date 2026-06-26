"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ContractTableNode } from "./ContractTableNode";
import { layoutGraph, type LayoutDirection } from "@/src/lib/data-model";

const nodeTypes = { contractTable: ContractTableNode };

export function ModelGraph({
  initialNodes,
  initialEdges,
  filterQuery,
  onNodeClick,
  direction,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  filterQuery: string;
  onNodeClick: (slug: string) => void;
  direction: LayoutDirection;
}) {
  // Apply filter + layout
  const { nodes: laidOutNodes, edges: laidOutEdges } = useMemo(
    () => layoutGraph(initialNodes, initialEdges, direction),
    [initialNodes, initialEdges, direction],
  );

  const filteredNodes = useMemo(() => {
    if (!filterQuery) return laidOutNodes;
    const q = filterQuery.toLowerCase();
    return laidOutNodes.filter((n) => {
      const d = n.data as { label: string; domain: string };
      return d.label?.toLowerCase().includes(q) || d.domain?.toLowerCase().includes(q);
    });
  }, [laidOutNodes, filterQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(
    () => laidOutEdges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)),
    [laidOutEdges, filteredNodeIds],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  // Sync nodes/edges when filter changes
  useEffect(() => { setNodes(filteredNodes); }, [filteredNodes, setNodes]);
  useEffect(() => { setEdges(filteredEdges); }, [filteredEdges, setEdges]);

  // Attach onHeaderClick to each node
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, onHeaderClick: (slug: string) => onNodeClick(slug) },
      })),
    );
  }, [onNodeClick, setNodes]);

  const handleMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    setHighlightedNode(node.id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHighlightedNode(null);
  }, []);

  // Dim non-connected nodes on hover
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
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, style: { ...n.style, opacity: nodeOpacity(n) } }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={handleMouseEnter}
        onNodeMouseLeave={handleMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#f1f5f9" gap={16} />
        <Controls className="!rounded-lg !border !border-gray-200 !shadow-sm" />
        <MiniMap
          nodeStrokeColor="#94a3b8"
          nodeColor={(n) => ((n.data as { color?: string })?.color) || "#94a3b8"}
          maskColor="rgba(0,0,0,0.1)"
          className="!rounded-lg !border !border-gray-200 !shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}
