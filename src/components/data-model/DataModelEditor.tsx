"use client";

import { useState, useMemo, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  parseContractsToGraph,
  layoutGraph,
  type DataModelContract,
  type LoadedModel,
  type LayoutDirection,
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
  const [direction, setDirection] = useState<LayoutDirection>("LR");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");

  const { nodes: rawNodes, edges } = useMemo(
    () => parseContractsToGraph(contracts, models),
    [contracts, models],
  );

  const { nodes: laidOutNodes } = useMemo(
    () => layoutGraph(rawNodes, edges, direction),
    [rawNodes, edges, direction],
  );

  const connectedFields = useMemo(
    () => computeConnectedFields(edges),
    [edges],
  );

  const [visibleTables, setVisibleTables] = useState<Set<string>>(() =>
    new Set(rawNodes.map((n) => n.id)),
  );

  const allVisible = visibleTables.size === rawNodes.length;

  const handleToggleTable = useCallback((id: string) => {
    setVisibleTables((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setVisibleTables((prev) =>
      prev.size === rawNodes.length
        ? new Set()
        : new Set(rawNodes.map((n) => n.id)),
    );
  }, [rawNodes]);

  const selectedContract = useMemo(
    () => (selectedSlug ? contracts.find((c) => c.slug === selectedSlug) ?? null : null),
    [selectedSlug, contracts],
  );

  const handleNodeClick = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex h-full gap-0 overflow-hidden">
        <FilterPanel
          nodes={rawNodes}
          visibleTables={visibleTables}
          onToggleTable={handleToggleTable}
          onToggleAll={handleToggleAll}
          allVisible={allVisible}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2">
            <span className="text-sm text-gray-500">
              {visibleTables.size} / {rawNodes.length} tables visible
            </span>
          </div>

          <div className="min-h-0 flex-1">
            <ModelGraph
              initialNodes={laidOutNodes}
              initialEdges={edges}
              connectedFields={connectedFields}
              viewMode={viewMode}
              visibleTables={visibleTables}
              direction={direction}
              onViewModeChange={setViewMode}
              onDirectionChange={setDirection}
              onNodeClick={handleNodeClick}
            />
          </div>
        </div>
      </div>

      <SidePanel contract={selectedContract} onClose={() => setSelectedSlug(null)} />
    </ReactFlowProvider>
  );
}
