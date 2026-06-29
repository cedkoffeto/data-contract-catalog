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
  const [focusedTable, setFocusedTable] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("LR");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");
  const [fitKey, setFitKey] = useState(0);

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

  useEffect(() => {
    setLaidOutNodes(layoutByMode(rawNodes, layoutEdges, layoutMode, connectedFields, viewMode).nodes);
  }, [rawNodes, layoutEdges, layoutMode, connectedFields, viewMode]);

  // Build neighbor map from edges
  const neighborIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!m.has(e.source)) m.set(e.source, new Set());
      if (!m.has(e.target)) m.set(e.target, new Set());
      m.get(e.source)!.add(e.target);
      m.get(e.target)!.add(e.source);
    }
    return m;
  }, [edges]);

  const handleFocusTable = useCallback((slug: string) => {
    setFocusedTable((prev) => (prev === slug ? null : slug));
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusedTable(null);
  }, []);

  // State-based visibility toggles (only active when no focus)
  const [visibleTablesState, setVisibleTablesState] = useState<Set<string>>(() =>
    new Set(rawNodes.map((n) => n.id)),
  );

  // When focused, visibleTables is derived; otherwise use toggle state
  const visibleTables = useMemo(() => {
    if (focusedTable) {
      const ids = new Set<string>([focusedTable]);
      const nbors = neighborIds.get(focusedTable);
      if (nbors) for (const id of nbors) ids.add(id);
      return ids;
    }
    return visibleTablesState;
  }, [focusedTable, neighborIds, visibleTablesState]);

  const filteredByLayer = useMemo(() => {
    if (!layerFilter) return rawNodes;
    return rawNodes.filter((n) => {
      const d = n.data as ContractTableNodeData;
      return (d.maturity || "bronze") === layerFilter;
    });
  }, [rawNodes, layerFilter]);

  const allFilteredVisible = focusedTable ? true : filteredByLayer.every((n) => visibleTablesState.has(n.id));

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

  const handleFitViewVisible = useCallback(() => {
    const visibleIds = new Set(visibleTables);
    const visibleNodes = rawNodes.filter((n) => visibleIds.has(n.id));
    const visibleEdges = layoutEdges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
    const { nodes: laidOutVisible } = layoutByMode(visibleNodes, visibleEdges, layoutMode, connectedFields, viewMode);
    const newPosMap = new Map(laidOutVisible.map((n) => [n.id, n]));
    setLaidOutNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]));
      return rawNodes.map((n) => newPosMap.get(n.id) ?? prevMap.get(n.id) ?? n);
    });
    setFitKey((k) => k + 1);
  }, [rawNodes, layoutEdges, layoutMode, connectedFields, viewMode, visibleTables]);

  return (
    <ReactFlowProvider>
      <div className="absolute inset-0 flex gap-0 overflow-hidden">
        <FilterPanel
          nodes={rawNodes}
          visibleTables={visibleTables}
          onToggleTable={handleToggleTable}
          onToggleDomain={handleToggleDomain}
          onToggleAll={handleToggleAll}
          allVisible={allFilteredVisible}
          focusedTable={focusedTable}
          onFocusTable={handleFocusTable}
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
              visibleTables={visibleTables}
              layoutMode={layoutMode}
              onViewModeChange={setViewMode}
              onLayoutModeChange={setLayoutMode}
              onNodeClick={handleNodeClick}
              onHeaderClick={handleFocusTable}
              focusedTable={focusedTable}
              onFitViewVisible={handleFitViewVisible}
              fitKey={fitKey}
            />
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-1.5 shadow-sm">
            <span className="text-sm text-gray-500">
              {visibleTables.size} / {rawNodes.length} tables visible
            </span>
            {focusedTable && (
              <button
                onClick={handleClearFocus}
                className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Clear focus
              </button>
            )}
          </div>
        </div>
      </div>

      <SidePanel contract={selectedContract} onClose={() => setSelectedSlug(null)} />
    </ReactFlowProvider>
  );
}
