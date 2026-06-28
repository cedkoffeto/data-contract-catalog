"use client";

import { useState, useMemo, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  parseContractsToGraph,
  layoutByMode,
  type DataModelContract,
  type LoadedModel,
  type LayoutMode,
} from "@/src/lib/data-model";
import { ModelGraph } from "./ModelGraph";
import { FilterPanel } from "./FilterPanel";
import { SidePanel } from "./SidePanel";
import type { Edge } from "@xyflow/react";

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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("LR");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");

  const { nodes: rawNodes, edges } = useMemo(
    () => parseContractsToGraph(contracts, models),
    [contracts, models],
  );

  const { nodes: laidOutNodes } = useMemo(
    () => layoutByMode(rawNodes, edges, layoutMode),
    [rawNodes, edges, layoutMode],
  );

  const connectedFields = useMemo(
    () => computeConnectedFields(edges),
    [edges],
  );

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

  // visibleTables derived from focus state
  const visibleTables = useMemo(() => {
    if (!focusedTable) {
      return new Set(rawNodes.map((n) => n.id));
    }
    const ids = new Set<string>([focusedTable]);
    const nbors = neighborIds.get(focusedTable);
    if (nbors) {
      for (const id of nbors) ids.add(id);
    }
    return ids;
  }, [focusedTable, rawNodes, neighborIds]);

  const allVisible = !focusedTable;

  // Toggles are no-ops when focused
  const handleToggleTable = useCallback((_id: string) => {}, []);
  const handleToggleAll = useCallback(() => {}, []);
  const handleToggleDomain = useCallback((_domain: string, _nodeIds: string[]) => {}, []);

  const selectedContract = useMemo(
    () => (selectedSlug ? contracts.find((c) => c.slug === selectedSlug) ?? null : null),
    [selectedSlug, contracts],
  );

  const handleNodeClick = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="absolute inset-0 flex gap-0 overflow-hidden">
        <FilterPanel
          nodes={rawNodes}
          visibleTables={visibleTables}
          onToggleTable={handleToggleTable}
          onToggleDomain={handleToggleDomain}
          onToggleAll={handleToggleAll}
          allVisible={allVisible}
          focusedTable={focusedTable}
          onFocusTable={handleFocusTable}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2">
            <span className="text-sm text-gray-500">
              {visibleTables.size} / {rawNodes.length} tables visible
            </span>
            {focusedTable && (
              <button
                onClick={handleClearFocus}
                className="ml-auto rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Clear focus
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1">
            <ModelGraph
              initialNodes={laidOutNodes}
              initialEdges={edges}
              connectedFields={connectedFields}
              viewMode={viewMode}
              visibleTables={visibleTables}
              layoutMode={layoutMode}
              onViewModeChange={setViewMode}
              onLayoutModeChange={setLayoutMode}
              onNodeClick={handleNodeClick}
              onHeaderClick={handleFocusTable}
              focusedTable={focusedTable}
            />
          </div>
        </div>
      </div>

      <SidePanel contract={selectedContract} onClose={() => setSelectedSlug(null)} />
    </ReactFlowProvider>
  );
}
