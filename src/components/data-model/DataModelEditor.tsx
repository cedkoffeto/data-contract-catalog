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
import { FilterBar } from "./FilterBar";
import { SidePanel } from "./SidePanel";

export function DataModelEditor({
  contracts,
  models,
}: {
  contracts: DataModelContract[];
  models: LoadedModel[];
}) {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [direction, setDirection] = useState<LayoutDirection>("LR");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");

  const { nodes, edges } = useMemo(
    () => parseContractsToGraph(contracts, models),
    [contracts, models],
  );

  const filteredNodes = useMemo(() => {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.filter((n) => {
      const d = n.data as { label?: string; domain?: string };
      return d.label?.toLowerCase().includes(q) || d.domain?.toLowerCase().includes(q);
    });
  }, [nodes, query]);

  const selectedContract = useMemo(
    () => (selectedSlug ? contracts.find((c) => c.slug === selectedSlug) ?? null : null),
    [selectedSlug, contracts],
  );

  const handleNodeClick = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col gap-3">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <FilterBar
            query={query}
            onChange={setQuery}
            total={nodes.length}
            visible={filteredNodes.length}
          />

          {/* View toggle */}
          <div className="flex shrink-0 rounded-lg border border-gray-200 bg-white p-0.5 text-xs shadow-sm">
            <button
              onClick={() => setViewMode("detailed")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                viewMode === "detailed" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Detailed
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                viewMode === "compact" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Compact
            </button>
          </div>

          {/* Layout direction */}
          <div className="flex shrink-0 rounded-lg border border-gray-200 bg-white p-0.5 text-xs shadow-sm">
            <button
              onClick={() => setDirection("LR")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                direction === "LR" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Left→Right
            </button>
            <button
              onClick={() => setDirection("TB")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                direction === "TB" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Top→Bottom
            </button>
          </div>
        </div>

        {/* Graph */}
        <div className="min-h-0 flex-1 rounded-xl border border-gray-200 bg-white shadow-sm">
          <ModelGraph
            initialNodes={nodes}
            initialEdges={edges}
            filterQuery={query}
            onNodeClick={handleNodeClick}
            direction={direction}
          />
        </div>
      </div>

      {/* Side Panel */}
      <SidePanel contract={selectedContract} onClose={() => setSelectedSlug(null)} />
    </ReactFlowProvider>
  );
}
