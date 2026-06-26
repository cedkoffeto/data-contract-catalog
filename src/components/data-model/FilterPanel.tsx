"use client";

import { useState, useMemo } from "react";
import { Search, Eye, EyeOff, PanelLeftClose, PanelLeft } from "lucide-react";
import type { Node } from "@xyflow/react";

const LAYERS = [
  { id: "bronze", label: "Bronze", activeClass: "bg-amber-500 text-white ring-1 ring-amber-300 shadow-sm", inactiveClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100" },
  { id: "silver", label: "Silver", activeClass: "bg-slate-500 text-white ring-1 ring-slate-300 shadow-sm", inactiveClass: "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100" },
  { id: "gold",   label: "Gold",   activeClass: "bg-yellow-500 text-white ring-1 ring-yellow-300 shadow-sm", inactiveClass: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 hover:bg-yellow-100" },
] as const;

function layerBadge(layer: string): string {
  switch (layer) {
    case "gold":   return "rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-yellow-100 text-yellow-700";
    case "silver": return "rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-slate-100 text-slate-600";
    default:       return "rounded px-1 py-0.5 text-[9px] font-semibold uppercase bg-amber-100 text-amber-700";
  }
}

export function FilterPanel({
  nodes,
  visibleTables,
  onToggleTable,
  onToggleAll,
  allVisible,
}: {
  nodes: Node[];
  visibleTables: Set<string>;
  onToggleTable: (id: string) => void;
  onToggleAll: () => void;
  allVisible: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [layerFilter, setLayerFilter] = useState<string | null>(null);

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
      className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-200 ${
        open ? "w-72" : "w-10"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border-b border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-500 hover:text-gray-700"
        title={open ? "Close panel" : "Open panel"}
      >
        {open ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
        {open && <span>Tables</span>}
      </button>

      {open && (
        <>
          {/* Layer filter — always visible at top */}
          <div className="flex gap-1.5 border-b border-gray-200 px-3 py-2.5">
            <button
              onClick={() => setLayerFilter(null)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                !layerFilter
                  ? "bg-gray-800 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              }`}
            >
              All
            </button>
            {LAYERS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayerFilter(l.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                  layerFilter === l.id ? l.activeClass : l.inactiveClass
                }`}
              >
                {l.label}
              </button>
            ))}
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
              {allVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Table list grouped by domain */}
          <div className="flex-1 overflow-y-auto">
            {groupedByDomain.map(([domain, ns]) => (
              <div key={domain}>
                <div className="sticky top-0 flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {domain}
                  </span>
                  <span className="rounded-full bg-gray-200 px-1.5 py-[1px] text-[10px] font-medium text-gray-500">
                    {ns.length}/{totalFiltered}
                  </span>
                </div>
                {ns.map((n) => {
                  const d = n.data as { label?: string; maturity?: string; color?: string };
                  const isVisible = visibleTables.has(n.id);
                  const layer = (d.maturity as string) || "bronze";
                  return (
                    <div
                      key={n.id}
                      className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-xs hover:bg-gray-50"
                    >
                      <button
                        onClick={() => onToggleTable(n.id)}
                        className="shrink-0 text-gray-400 hover:text-gray-600"
                        title={isVisible ? "Hide" : "Show"}
                      >
                        {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="truncate font-medium text-gray-700">{d.label}</span>
                      <span className={layerBadge(layer)}>{layer}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            {totalFiltered === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No tables match the filter
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
