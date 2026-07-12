"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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

function useSearchParam(key: string): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key));
  }, [key]);
  return value;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Throttle ResizeObserver to animation frame rate
  const resizeRafRef = useRef(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = requestAnimationFrame(() => {
          setContainerWidth(entry.contentRect.width);
        });
      }
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(resizeRafRef.current); };
  }, []);

  const STORAGE_KEY = "dcc-data-model-prefs";
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const prefs = JSON.parse(stored);
      if (prefs.layoutMode) setLayoutMode(prefs.layoutMode);
      if (prefs.viewMode) setViewMode(prefs.viewMode);
      if (prefs.layerFilter) setLayerFilter(prefs.layerFilter);
    } catch {}
  }, []);

  function savePrefs(partial: Record<string, unknown>) {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
    } catch {}
  }

  const { nodes: rawNodes, edges, orphanRefs } = useMemo(
    () => parseContractsToGraph(contracts, models),
    [contracts, models],
  );

  const searchMatchIds = useMemo(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    const ids = rawNodes
      .filter((n) => {
        const d = n.data as ContractTableNodeData;
        const label = d.label?.toLowerCase() || "";
        const slug = d.slug?.toLowerCase() || "";
        const domain = d.domain?.toLowerCase() || "";
        const context = d.context?.toLowerCase() || "";
        return label.includes(q) || slug.includes(q) || domain.includes(q) || context.includes(q);
      })
      .map((n) => n.id);
    return ids.length > 0 ? ids : null;
  }, [searchQuery, rawNodes]);

  useEffect(() => {
    if (searchMatchIds && searchMatchIds.length > 0) {
      setCenterSlug(searchMatchIds[0]);
      setCenterKey((k) => k + 1);
    }
  }, [searchMatchIds]);

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

  const [laidOutNodes, setLaidOutNodes] = useState<FlowNode[]>(() => layoutByMode(rawNodes, layoutEdges, layoutMode, connectedFields, viewMode, 0).nodes);
  const layoutWidthRef = useRef(0);

  function relayoutVisible(prev: FlowNode[]): FlowNode[] {
    const ids = new Set(visibleTablesState);
    const visibleNodes = rawNodes.filter((n) => ids.has(n.id));
    const visibleEdges = layoutEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const { nodes: laidOut } = layoutByMode(visibleNodes, visibleEdges, layoutMode, connectedFields, viewMode, layoutWidthRef.current);
    const newPosMap = new Map(laidOut.map((n) => [n.id, n]));
    const prevMap = new Map(prev.map((n) => [n.id, n]));
    return rawNodes.map((n) => newPosMap.get(n.id) ?? prevMap.get(n.id) ?? n);
  }

  // Only re-layout when layout-critical props change (NOT on every resize)
  useEffect(() => {
    setLaidOutNodes(relayoutVisible);
  }, [rawNodes, layoutEdges, layoutMode, connectedFields, viewMode]);

  // In TB mode, also re-layout when containerWidth changes (affects isolated grid)
  useEffect(() => {
    if (layoutMode !== "TB" || containerWidth === layoutWidthRef.current) return;
    layoutWidthRef.current = containerWidth;
    setLaidOutNodes(relayoutVisible);
  }, [layoutMode, containerWidth]);

  const [visibleTablesState, setVisibleTablesState] = useState<Set<string>>(() =>
    new Set(rawNodes.map((n) => n.id)),
  );

  useEffect(() => { savePrefs({ layoutMode }); }, [layoutMode]);
  useEffect(() => { savePrefs({ viewMode }); }, [viewMode]);
  useEffect(() => { savePrefs({ layerFilter }); }, [layerFilter]);

  const focusSlug = useSearchParam("slug");

  useEffect(() => {
    if (!focusSlug || rawNodes.length === 0) return;
    const node = rawNodes.find((n) => {
      const d = n.data as ContractTableNodeData;
      return d.slug === focusSlug;
    });
    if (node) {
      setCenterSlug(node.id);
      setCenterKey((k) => k + 1);
    }
  }, [focusSlug, rawNodes]);

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
    () => {
      if (!selectedSlug) return null;
      const map = new Map(contracts.map((c) => [c.slug, c]));
      return map.get(selectedSlug) ?? null;
    },
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
          query={searchQuery}
          onQueryChange={setSearchQuery}
        />

        <div ref={containerRef} className="relative flex min-w-0 flex-1 flex-col">
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
              searchMatchIds={searchMatchIds}
              visibleCount={visibleTablesState.size}
              totalCount={rawNodes.length}
              orphanRefs={orphanRefs}
            />
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
