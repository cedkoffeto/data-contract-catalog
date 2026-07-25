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
import dynamic from "next/dynamic";

const ModelGraph = dynamic(() => import("./ModelGraph").then((m) => m.ModelGraph), { ssr: false });
import { FilterPanel } from "./FilterPanel";
import { SidePanel } from "./SidePanel";
import { Position, type Edge, type Node as FlowNode } from "@xyflow/react";

type ParsedRelation = { left?: { field?: string }; right?: { field?: string } };

function computeConnectedFields(edges: Edge[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const edge of edges) {
    const data = edge.data as { parsed?: ParsedRelation[] };
    if (data?.parsed) {
      for (const p of data.parsed) {
        if (p.left?.field) {
          if (!map.has(edge.source)) map.set(edge.source, new Map());
          const inner = map.get(edge.source)!;
          inner.set(p.left.field, (inner.get(p.left.field) ?? 0) + 1);
        }
        if (p.right?.field) {
          if (!map.has(edge.target)) map.set(edge.target, new Map());
          const inner = map.get(edge.target)!;
          inner.set(p.right.field, (inner.get(p.right.field) ?? 0) + 1);
        }
      }
    }
  }
  return map;
}

export function DataModelEditor({
  contracts,
  models,
  focusSlug,
  focusDomain,
  focusContext,
}: {
  contracts: DataModelContract[];
  models: LoadedModel[];
  focusSlug?: string | null;
  focusDomain?: string | null;
  focusContext?: string | null;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("LR");
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("detailed");
  const [fitKey, setFitKey] = useState(0);
  const [layoutFitKey, setLayoutFitKey] = useState(0);
  const [centerSlug, setCenterSlug] = useState<string | null>(null);
  const [centerKey, setCenterKey] = useState(0);
  const [collapsedTables, setCollapsedTables] = useState<Set<string>>(new Set());
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
    return edges.map((e) => {
      const ew = e as unknown as { sourcePosition?: Position; targetPosition?: Position };
      return {
        ...e,
        sourcePosition: ew.sourcePosition ?? (isTB ? Position.Bottom : Position.Right),
        targetPosition: ew.targetPosition ?? (isTB ? Position.Top : Position.Left),
      };
    });
  }, [edges, layoutMode]);

  const [laidOutNodes, setLaidOutNodes] = useState<FlowNode[]>(() => layoutByMode(rawNodes, layoutEdges, layoutMode, connectedFields, viewMode, 0, collapsedTables).nodes);
  const layoutWidthRef = useRef(0);

  const [visibleTablesState, setVisibleTablesState] = useState<Set<string>>(() =>
    new Set(rawNodes.map((n) => n.id)),
  );

  const customWidthsRef = useRef<Map<string, number>>(new Map());
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  function relayoutVisible(prev: FlowNode[]): FlowNode[] {
    const ids = new Set(visibleTablesState);
    const nodesWithWidths = rawNodes.map((n) => {
      const w = customWidthsRef.current.get(n.id);
      return typeof w === "number" ? { ...n, data: { ...n.data, _customWidth: w } } : n;
    });
    const visibleNodes = nodesWithWidths.filter((n) => ids.has(n.id));
    const visibleEdges = layoutEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const { nodes: laidOut } = layoutByMode(visibleNodes, visibleEdges, layoutMode, connectedFields, viewMode, layoutWidthRef.current, collapsedTables);
    const newPosMap = new Map(laidOut.map((n) => [n.id, n]));
    const prevMap = new Map(prev.map((n) => [n.id, n]));
    return rawNodes.map((n) => newPosMap.get(n.id) ?? prevMap.get(n.id) ?? n);
  }

  const handleNodeResize = useCallback((nodeId: string, width: number) => {
    customWidthsRef.current.set(nodeId, width);
    clearTimeout(resizeDebounceRef.current);
    resizeDebounceRef.current = setTimeout(() => {
      setLaidOutNodes((prev) => relayoutVisible(prev));
    }, 300);
  }, [rawNodes, layoutEdges, layoutMode, connectedFields, viewMode, visibleTablesState]);

  useEffect(() => { savePrefs({ layoutMode }); }, [layoutMode]);
  useEffect(() => { savePrefs({ viewMode }); }, [viewMode]);
  useEffect(() => { savePrefs({ layerFilter }); }, [layerFilter]);

  useEffect(() => () => clearTimeout(resizeDebounceRef.current), []);

  // Only re-layout when layout-critical props change (NOT on every resize or collapse)
  useEffect(() => {
    setLaidOutNodes(relayoutVisible);
  }, [rawNodes, layoutEdges, layoutMode, connectedFields, viewMode]);

  // On collapse/expand: only recreate the changed node objects (no flicker)
  const prevCollapsedRef = useRef<Set<string>>(collapsedTables);
  useEffect(() => {
    const prev = prevCollapsedRef.current;
    if (prev === collapsedTables) return;
    prevCollapsedRef.current = collapsedTables;
    const added = [...collapsedTables].filter((id) => !prev.has(id));
    const removed = [...prev].filter((id) => !collapsedTables.has(id));
    const changedIds = new Set([...added, ...removed]);
    if (changedIds.size === 0) return;
    setLaidOutNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (!changedIds.has(n.id)) return n;
        // New data ref → ContractTableNode memo detects change → re-renders → ResizeObserver fires
        return { ...n, data: { ...n.data } };
      }),
    );
  }, [collapsedTables]);

  // In TB mode, also re-layout when containerWidth changes (affects isolated grid)
  useEffect(() => {
    if (layoutMode !== "TB" || containerWidth === layoutWidthRef.current) return;
    layoutWidthRef.current = containerWidth;
    setLaidOutNodes(relayoutVisible);
  }, [layoutMode, containerWidth]);

  // Center view after mode switch — relayout already ran via the effect above
  useEffect(() => { setFitKey((k) => k + 1); }, [viewMode]);
  useEffect(() => {
    if (!focusSlug || rawNodes.length === 0) return;
    const node = rawNodes.find((n) => {
      const d = n.data as ContractTableNodeData;
      const slugMatch = d.slug === focusSlug || focusSlug === `${d.maturity}-${d.slug}`;
      if (!slugMatch) return false;
      if (focusDomain && d.domain !== focusDomain) return false;
      if (focusContext && d.context !== focusContext) return false;
      return true;
    });
    if (node) {
      // Delay to let React Flow measure nodes after first render
      const t = setTimeout(() => {
        setCenterSlug(node.id);
        setCenterKey((k) => k + 1);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [focusSlug, focusDomain, focusContext, rawNodes]);

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

  const allFilteredVisible = useMemo(() => filteredByLayer.every((n) => visibleTablesState.has(n.id)), [filteredByLayer, visibleTablesState]);

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

  const selectedContract = useMemo(
    () => {
      if (!selectedSlug) return null;
      return contracts.find((c) => c.slug === selectedSlug) ?? null;
    },
    [selectedSlug, contracts],
  );

  const handleNodeClick = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedTables((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleShowConnected = useCallback((nodeId: string) => {
    setVisibleTablesState((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      for (const e of edges) {
        if (e.source === nodeId) next.add(e.target);
        if (e.target === nodeId) next.add(e.source);
      }
      return next;
    });
    setFitKey((k) => k + 1);
  }, [edges]);

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
          onToggleAll={handleToggleAll}
          allVisible={allFilteredVisible}
          onCenterTable={handleCenterView}
          layerFilter={layerFilter}
          onLayerFilter={setLayerFilter}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          edges={edges}
          onShowConnected={handleShowConnected}
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
              onLayoutModeChange={(mode) => { setLayoutMode(mode); setLayoutFitKey((k) => k + 1); }}
              onNodeClick={handleNodeClick}
              onHeaderClick={handleNodeClick}
              onFitViewVisible={handleFitViewVisible}
              fitKey={fitKey}
              layoutFitKey={layoutFitKey}
              centerSlug={centerSlug}
              centerKey={centerKey}
              searchMatchIds={searchMatchIds}
              visibleCount={visibleTablesState.size}
              totalCount={rawNodes.length}
              orphanRefs={orphanRefs}
              collapsedTables={collapsedTables}
              onToggleCollapse={handleToggleCollapse}
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
