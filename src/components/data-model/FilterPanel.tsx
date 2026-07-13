"use client";

import { useState, useMemo, useRef, useCallback, useEffect, memo } from "react";
import { Search, Eye, EyeOff, PanelLeftClose } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { ContractTableNodeData } from "@/src/lib/data-model";

const LAYERS = [
  { id: "bronze", label: "Bronze", activeClass: "bg-amber-500 text-white shadow-sm", inactiveClass: "bg-white text-amber-700 hover:bg-amber-50" },
  { id: "silver", label: "Silver", activeClass: "bg-slate-500 text-white shadow-sm", inactiveClass: "bg-white text-slate-600 hover:bg-slate-50" },
  { id: "gold",   label: "Gold",   activeClass: "bg-yellow-500 text-white shadow-sm", inactiveClass: "bg-white text-yellow-700 hover:bg-yellow-50" },
] as const;

const MIN_WIDTH = 160;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 288;

function nodeData(n: Node): ContractTableNodeData {
  return n.data as ContractTableNodeData;
}

const TableListItem = memo(function TableListItem({
  node,
  isVisible,
  onCenterTable,
  onToggleTable,
}: {
  node: Node;
  isVisible: boolean;
  onCenterTable: (slug: string) => void;
  onToggleTable: (id: string) => void;
}) {
  const d = nodeData(node);
  const handleCenter = useCallback(() => onCenterTable(node.id), [onCenterTable, node.id]);
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTable(node.id);
  }, [onToggleTable, node.id]);
  return (
    <div
      className={`flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-xs ${isVisible ? "cursor-pointer hover:bg-gray-50" : "opacity-40"}`}
      onClick={isVisible ? handleCenter : undefined}
    >
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: d.color }}
      />
      <span className="flex-1 min-w-0 truncate font-medium text-gray-700" title={d.label ?? ""}>{d.slug}</span>
      <button
        onClick={handleToggle}
        className="shrink-0 text-gray-400 hover:text-gray-600"
        title={isVisible ? "Hide" : "Show"}
      >
        {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
    </div>
  );
});

export function FilterPanel({
  nodes,
  visibleTables,
  onToggleTable,
  onToggleDomain,
  onToggleAll,
  allVisible,
  onCenterTable,
  layerFilter,
  onLayerFilter,
  query,
  onQueryChange,
}: {
  nodes: Node[];
  visibleTables: Set<string>;
  onToggleTable: (id: string) => void;
  onToggleDomain: (domain: string, nodeIds: string[]) => void;
  onToggleAll: () => void;
  allVisible: boolean;
  onCenterTable: (slug: string) => void;
  layerFilter: string | null;
  onLayerFilter: (layer: string | null) => void;
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  // Group filtered nodes by domain
  const groupedByDomain = useMemo(() => {
    const filtered = nodes.filter((n) => {
      const d = nodeData(n);
      const layer = d.maturity || "bronze";
      const domain = d.domain || "Unknown";
      if (layerFilter && layer !== layerFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!d.label?.toLowerCase().includes(q) && !d.slug?.toLowerCase().includes(q) && !domain.toLowerCase().includes(q))
          return false;
      }
      return true;
    });

    const grouped = new Map<string, Node[]>();
    for (const n of filtered) {
      const d = nodeData(n);
      const domain = d.domain || "Unknown";
      if (!grouped.has(domain)) grouped.set(domain, []);
      grouped.get(domain)!.push(n);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [nodes, layerFilter, query]);

  const totalFiltered = groupedByDomain.reduce((sum, [, ns]) => sum + ns.length, 0);

  const tableListMemoized = useMemo(() => {
    const groups = groupedByDomain.map(([domain, ns]) => {
      const allDomainVisible = ns.every((n) => visibleTables.has(n.id));
      return (
        <div key={domain}>
          <div className="sticky top-0 flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {domain}
            </span>
            <span className="rounded-full bg-gray-200 px-1.5 py-[1px] text-[10px] font-medium text-gray-500">
              {ns.length}/{totalFiltered}
            </span>
            <div className="flex-1 min-w-0" />
            <button
              onClick={() => onToggleDomain(domain, ns.map((n) => n.id))}
              className="shrink-0 text-gray-400 hover:text-gray-600"
              title={allDomainVisible ? "Hide domain" : "Show domain"}
            >
              {allDomainVisible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>
          {ns.map((n) => (
            <TableListItem
              key={n.id}
              node={n}
              isVisible={visibleTables.has(n.id)}
              onCenterTable={onCenterTable}
              onToggleTable={onToggleTable}
            />
          ))}
        </div>
      );
    });
    if (totalFiltered === 0) {
      groups.push(
        <div key="empty" className="px-3 py-4 text-center text-xs text-gray-400">
          No tables match the filter
        </div>
      );
    }
    return groups;
  }, [groupedByDomain, visibleTables, totalFiltered, onToggleDomain, onCenterTable, onToggleTable]);

  return (
    <div
      className={`data-model-filter-panel relative flex h-full min-h-0 flex-col border-r border-gray-200 bg-white shrink-0 ${
        open ? "" : "w-auto"
      }`}
      style={{ width: open ? width : undefined }}
    >
      {open ? (
        <div className="flex items-center border-b border-gray-200 pl-2.5 pr-3 py-2">
          <span className="flex-1 text-center text-sm font-bold text-gray-900">
            Data Model Editor
          </span>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            title="Close panel"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="m-1.5 shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700"
          title="Open panel"
        >
          <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>
            <PanelLeftClose size={18} />
          </span>
        </button>
      )}

      {open && (
        <>

          {/* Layer filter — pill toggle like Discussion */}
          <div className="flex border-b border-gray-200 px-3 py-2.5">
            <div className="inline-flex rounded-lg p-0.5" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
                {(["all", ...LAYERS] as const).map((item) => {
                  const isActive = item === "all" ? !layerFilter : layerFilter === item.id;
                  return (
                    <button
                      key={item === "all" ? "all" : item.id}
                      type="button"
                      onClick={() => onLayerFilter(item === "all" ? null : item.id)}
                    className="inline-flex items-center rounded px-2.5 py-1 text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: isActive ? "#1f2937" : "transparent",
                      color: isActive ? "#fff" : "#374151",
                    }}
                  >
                    {item === "all" ? "All" : item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + toggle all row */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-1.5">
            <Search size={13} className="shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Filter tables..."
              className="min-w-0 flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400"
            />
            <button
              onClick={onToggleAll}
              className="shrink-0 text-gray-400 hover:text-gray-600"
              title={allVisible ? "Hide all" : "Show all"}
            >
              {allVisible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>

          {/* Table list grouped by domain */}
          <div className="flex-1 overflow-y-auto">
            {tableListMemoized}
          </div>
        </>
      )}

      {/* Resize handle */}
      {open && (
        <div
          className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:w-1.5 hover:bg-blue-400 active:bg-blue-500"
          style={{ right: -1 }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
}
