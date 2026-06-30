"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  parseContractsToGraph,
  layoutByMode,
  type DataModelContract,
  type LoadedModel,
  type LayoutMode,
  type ContractTableNodeData,
} from "@/src/lib/data-model";
import { ModelGraph } from "./ModelGraph";
import { FilterPanel } from "./FilterPanel";
import { SidePanel } from "./SidePanel";
import { Position, type Edge, type Node as FlowNode } from "@xyflow/react";

function computeConnectedFields(edges: Edge[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.sourceHandle) {
      const s = edge.sourceHandle as string;
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      map.get(edge.source)!.add(s);
    }
    if (edge.targetHandle) {
      const t = edge.targetHandle as string;
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.target)!.add(t);
    }
  }
  return map;
}

export function DataModelEditor({
  contracts,
  models,
}: {
  contracts: DataModelContract[];
  models: LoadedModel[];
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("LR");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");
  const [fitKey, setFitKey] = useState(0);
  const [centerSlug, setCenterSlug] = useState<string | null>(null);
  const [centerKey, setCenterKey] = useState(0);

  const { nodes: rawNodes, edges } = useMemo(
    () => parseContractsToGraph(contracts, models),
    [contracts, models],
  );

  const connectedFields = useMemo(
    () => computeConnectedFields(edges),
    [edges],
  );

  const layoutEdges = useMemo(() => {
    const isTB = layoutMode === "TB";
    return edges.map((e) => ({
      ...e,
      sourcePosition: isTB ? Position.Bottom : Position.Right,
      targetPosition: isTB ? Position.Top : Position.Left,
    }));
  }, [edges, layoutMode]);

  const [laidOutNodes, setLaidOutNodes] = useState<FlowNode[]>(() => layoutByMode(rawNodes, layoutEdges, layoutMode, connectedFields, viewMode).nodes);

  function relayoutVisible(prev: FlowNode[]): FlowNode[] {
    const ids = new Set(visibleTablesState);
    const visibleNodes = rawNodes.filter((n) => ids.has(n.id));
    const visibleEdges = layoutEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const { nodes: laidOut } = layoutByMode(visibleNodes, visibleEdges, layoutMode, connectedFields, viewMode);
    const newPosMap = new Map(laidOut.map((n) => [n.id, n]));
    const prevMap = new Map(prev.map((n) => [n.id, n]));
    return rawNodes.map((n) => newPosMap.get(n.id) ?? prevMap.get(n.id) ?? n);
  }

  useEffect(() => {
    setLaidOutNodes(relayoutVisible);
  }, [rawNodes, layoutEdges, layoutMode, connectedFields, viewMode]);

  const [visibleTablesState, setVisibleTablesState] = useState<Set<string>>(() =>
    new Set(rawNodes.map((n) => n.id)),
  );

  const handleCenterView = useCallback((slug: string) => {
    setCenterSlug(slug);
    setCenterKey((k) => k + 1);
  }, []);

  const filteredByLayer = useMemo(() => {
    if (!layerFilter) return rawNodes;
    return rawNodes.filter((n) => {
      const d = n.data as ContractTableNodeData;
      return (d.maturity || "bronze") === layerFilter;
    });
  }, [rawNodes, layerFilter]);

  const allFilteredVisible = filteredByLayer.every((n) => visibleTablesState.has(n.id));

  const handleToggleTable = useCallback((id: string) => {
    setVisibleTablesState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    const targetIds = layerFilter
      ? new Set(filteredByLayer.map((n) => n.id))
      : new Set(rawNodes.map((n) => n.id));
    setVisibleTablesState((prev) => {
      const allVisible = [...targetIds].every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of targetIds) {
        if (allVisible) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setFitKey((k) => k + 1);
  }, [rawNodes, layerFilter, filteredByLayer]);

  const handleToggleDomain = useCallback((_domain: string, nodeIds: string[]) => {
    setVisibleTablesState((prev) => {
      const allVisible = nodeIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of nodeIds) {
        if (allVisible) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setFitKey((k) => k + 1);
  }, []);

  const selectedContract = useMemo(
    () => (selectedSlug ? contracts.find((c) => c.slug === selectedSlug) ?? null : null),
    [selectedSlug, contracts],
  );

  const handleNodeClick = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  function handleFitViewVisible() {
    setLaidOutNodes(relayoutVisible);
    setFitKey((k) => k + 1);
  }

  return (
    <ReactFlowProvider>
      <div className="absolute inset-0 flex gap-0 overflow-hidden">
        <FilterPanel
          nodes={rawNodes}
          visibleTables={visibleTablesState}
          onToggleTable={handleToggleTable}
          onToggleDomain={handleToggleDomain}
          onToggleAll={handleToggleAll}
          allVisible={allFilteredVisible}
          onCenterTable={handleCenterView}
          layerFilter={layerFilter}
          onLayerFilter={setLayerFilter}
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <ModelGraph
              initialNodes={laidOutNodes}
              initialEdges={layoutEdges}
              connectedFields={connectedFields}
              viewMode={viewMode}
              visibleTables={visibleTablesState}
              layoutMode={layoutMode}
              onViewModeChange={setViewMode}
              onLayoutModeChange={setLayoutMode}
              onNodeClick={handleNodeClick}
              onHeaderClick={handleNodeClick}
              onFitViewVisible={handleFitViewVisible}
              fitKey={fitKey}
              centerSlug={centerSlug}
              centerKey={centerKey}
            />
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-1.5 shadow-sm">
            <span className="text-sm text-gray-500">
              {visibleTablesState.size} / {rawNodes.length} tables visible
            </span>
          </div>
        </div>
      </div>

      <SidePanel
        contract={selectedContract}
        contracts={contracts}
        edges={edges}
        onClose={() => setSelectedSlug(null)}
        onCenterView={handleCenterView}
      />
    </ReactFlowProvider>
  );
}
