"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Search, Eye, EyeOff, PanelLeftClose, PanelLeft, GripVertical } from "lucide-react";
import type { Node } from "@xyflow/react";

const LAYERS = [
  { id: "bronze", label: "Bronze", activeClass: "bg-amber-500 text-white shadow-sm", inactiveClass: "bg-white text-amber-700 hover:bg-amber-50" },
  { id: "silver", label: "Silver", activeClass: "bg-slate-500 text-white shadow-sm", inactiveClass: "bg-white text-slate-600 hover:bg-slate-50" },
  { id: "gold",   label: "Gold",   activeClass: "bg-yellow-500 text-white shadow-sm", inactiveClass: "bg-white text-yellow-700 hover:bg-yellow-50" },
] as const;

function layerBadge(layer: string): string {
  switch (layer) {
    case "gold":   return "rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-yellow-100 text-yellow-700";
    case "silver": return "rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-slate-100 text-slate-600";
    default:       return "rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-amber-100 text-amber-700";
  }
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 288;

export function FilterPanel({
  nodes,
  visibleTables,
  onToggleTable,
  onToggleDomain,
  onToggleAll,
  allVisible,
  focusedTable,
  onFocusTable,
}: {
  nodes: Node[];
  visibleTables: Set<string>;
  onToggleTable: (id: string) => void;
  onToggleDomain: (domain: string, nodeIds: string[]) => void;
  onToggleAll: () => void;
  allVisible: boolean;
  focusedTable: string | null;
  onFocusTable: (slug: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [query, setQuery] = useState("");
  const [layerFilter, setLayerFilter] = useState<string | null>(null);

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
      const d = n.data as { maturity?: string; domain?: string; label?: string };
      const layer = (d.maturity as string) || "bronze";
      const domain = (d.domain as string) || "Unknown";
      if (layerFilter && layer !== layerFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!d.label?.toLowerCase().includes(q) && !domain.toLowerCase().includes(q))
          return false;
      }
      return true;
    });

    const grouped = new Map<string, Node[]>();
    for (const n of filtered) {
      const domain = ((n.data as { domain?: string })?.domain as string) || "Unknown";
      if (!grouped.has(domain)) grouped.set(domain, []);
      grouped.get(domain)!.push(n);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [nodes, layerFilter, query]);

  const totalFiltered = groupedByDomain.reduce((sum, [, ns]) => sum + ns.length, 0);

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col border-r border-gray-200 bg-white shrink-0 ${
        open ? "" : "w-10"
      }`}
      style={{ width: open ? width : undefined }}
    >
      <div className="flex items-center border-b border-gray-200 px-2.5 py-2">
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-medium text-gray-500 hover:text-gray-700"
          title={open ? "Close panel" : "Open panel"}
        >
          {open ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
        </button>
        {open && (
          <span className="flex-1 text-center text-sm font-bold text-gray-900">
            Data Model Editor
          </span>
        )}
      </div>

      {open && (
        <>

          {/* Layer filter — pill toggle like Discussion */}
          <div className="flex border-b border-gray-200 px-3 py-2.5">
            <div className="inline-flex rounded-full border p-0.5" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
              {(["all", ...LAYERS] as const).map((item) => {
                const isActive = item === "all" ? !layerFilter : layerFilter === item.id;
                return (
                  <button
                    key={item === "all" ? "all" : item.id}
                    type="button"
                    onClick={() => setLayerFilter(item === "all" ? null : item.id)}
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
              onChange={(e) => setQuery(e.target.value)}
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
            {groupedByDomain.map(([domain, ns]) => {
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
                {ns.map((n) => {
                  const d = n.data as { label?: string; slug?: string; maturity?: string; color?: string };
                  const isVisible = visibleTables.has(n.id);
                  const layer = (d.maturity as string) || "bronze";
                  return (
                    <div
                      key={n.id}
                      className={`flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-xs hover:bg-gray-50 ${focusedTable === n.id ? "bg-blue-50" : ""}`}
                      onClick={() => onFocusTable(n.id)}
                    >
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${focusedTable === n.id ? "ring-2 ring-blue-300 ring-offset-1" : ""}`}
                        style={{ backgroundColor: d.color }}
                      />
                      <span className={`flex-1 min-w-0 truncate font-medium ${focusedTable === n.id ? "text-blue-700" : "text-gray-700"}`} title={d.label ?? ""}>{d.slug}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleTable(n.id); }}
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        title={isVisible ? "Hide" : "Show"}
                      >
                        {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>
                  );
                })}
              </div>
              );
            })}
            {totalFiltered === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No tables match the filter
              </div>
            )}
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
