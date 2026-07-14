"use client";

import { memo, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Table, Key, ChevronUp, ChevronDown, Info } from "lucide-react";
import { ViewModeCtx } from "./ModelGraph";
import type { ContractTableNodeData } from "@/src/lib/data-model";

const STYLE_ID = "dcc-turbo-spinner";

const maturityBadge: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-700",
  silver: "bg-slate-100 text-slate-600",
  gold:   "bg-yellow-100 text-yellow-700",
};

export const ContractTableNode = memo(function ContractTableNode({ selected, id, data }: NodeProps) {
  const d = data as ContractTableNodeData;
  const { viewMode, connectedFields, onHeaderClick, onFieldClick, searchMatchIds, collapsedTables, onToggleCollapse } = useContext(ViewModeCtx);
  const isSearchMatch = searchMatchIds?.has(id) ?? false;
  const allFields = d.fields;
  const nodeConnected = connectedFields.get(id);
  const connectedSet = nodeConnected ?? new Set<string>();
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const collapsed = collapsedTables.has(id);
  const showingDetailed = viewMode === "detailed" ? !collapsed : collapsed;

  const fields = useMemo(() => {
    if (showingDetailed) return allFields;
    return allFields.filter((f) => connectedSet.has(f.name));
  }, [allFields, showingDetailed, connectedSet]);

  // Inject spinner keyframes once
  useEffect(() => {
    if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = `
        @keyframes dcc-turbo-spin {
          100% { transform: translate(-50%, -50%) rotate(-360deg); }
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  return (<>
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 shadow-md transition-shadow hover:shadow-lg ${
        selected ? "ring-2 ring-blue-500" : isSearchMatch ? "ring-2 ring-green-500" : ""
      }`}
      style={{
        minWidth: 220,
        maxWidth: 480,
        padding: 2,
        position: "relative",
      }}
    >
      {/* Gradient disc — larger than container, circular, clipped by overflow-hidden */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: "50%",
          top: "50%",
          width: "calc(100% * 1.41421356237)",
          paddingBottom: "calc(100% * 1.41421356237)",
          borderRadius: "100%",
          background: `conic-gradient(from -160deg at 50% 50%, ${d.color}, ${d.color}aa, ${d.color}44, ${d.color}aa, ${d.color})`,
          transform: selected ? "translate(-50%, -50%)" : "translate(-50%, -50%)",
          animation: selected ? "dcc-turbo-spin 4s linear infinite" : "none",
        }}
      />

      {/* Inner content — masks the gradient core so only the 2px padding shows it */}
      <div className="relative overflow-hidden rounded-[14px] bg-white">
        {/* Color accent strip */}
        <div style={{ height: 4, backgroundColor: d.color }} />

        {/* Header */}
        <div className="flex min-w-0 cursor-grab active:cursor-grabbing items-center gap-2 px-3 py-2" style={{ background: d.color.replace("hsl(", "hsla(").replace(")", ", 0.1)") }}>
          <span className="flex h-5 cursor-pointer items-center" onClick={(e) => { e.stopPropagation(); window.open(`/contracts/${d.slug}`, "_blank", "noopener,noreferrer"); }} title="Open contract detail"><Table size={14} style={{ color: d.color }} /></span>
          <span className="flex h-5 min-w-0 items-center text-sm font-semibold tracking-tight text-gray-900" title={`${d.label}\ndomain: ${d.domain}\ncontext: ${d.context ?? ""}\nid: ${id}`}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) { e.stopPropagation(); window.open(`/contracts/${d.slug}`, "_blank", "noopener,noreferrer"); }
              else onHeaderClick(d.slug);
            }}
          ><span className="truncate">{d.slug}</span></span>
          <span className={`ml-auto flex shrink-0 h-5 items-center rounded px-1.5 text-[9px] font-bold uppercase leading-none ${maturityBadge[d.maturity as string] || maturityBadge.bronze}`}>
            {d.maturity as string}
          </span>
        </div>

        {/* Separator between header and fields */}
        <div className="mx-3" style={{ height: 1, backgroundColor: d.color, opacity: 0.3 }} />

        {/* Fields */}
        <div>
          {fields.length === 0 && (
            <div className="px-3 py-2 text-xs italic text-gray-400">No fields</div>
          )}
          {!showingDetailed && allFields.length > fields.length && (
            <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-50">
              {fields.length} connected · {allFields.length - fields.length} hidden
            </div>
          )}
          {fields.map((f) => {
            const isConnected = connectedSet.has(f.name);
            return (
              <div key={f.name} className="group relative flex min-w-0 cursor-pointer items-center gap-2 border-t border-gray-50 px-3 py-[7px] text-xs text-gray-700 hover:bg-gray-50" onClick={(e) => {
                if (e.ctrlKey || e.metaKey) { e.stopPropagation(); window.open(`/contracts/${d.slug}`, "_blank", "noopener,noreferrer"); }
                else onFieldClick?.(d.slug);
              }}>
                {isConnected && <Handle type="target" position={Position.Left} id={f.name} className="!opacity-0 !pointer-events-none" />}
                {isConnected ? (
                  <Key size={10} className="shrink-0 text-amber-500" />
                ) : (
                  <span className="w-[10px] shrink-0" />
                )}
                <span className={`min-w-0 font-mono text-[11px] leading-none ${isConnected ? "font-bold text-gray-900" : "text-gray-600"}`}>{f.name}</span>
                <span className="w-4 shrink-0 flex items-center justify-center">
                  {f.description && (
                    <Info
                      size={11}
                      className="invisible group-hover:visible cursor-pointer text-gray-400 hover:text-blue-500 transition-colors"
                      onMouseEnter={(e) => {
                        setHoveredField(f.name);
                        const rect = (e.currentTarget as unknown as HTMLElement).getBoundingClientRect();
                        setTooltipPos({ top: rect.top - 6, left: rect.right + 8 });
                      }}
                      onMouseLeave={() => { setHoveredField(null); setTooltipPos(null); }}
                    />
                  )}
                </span>
                <span className="ml-auto whitespace-nowrap text-[10px] leading-none text-gray-400">{f.type}</span>
                {isConnected && <Handle type="source" position={Position.Right} id={f.name} className="!opacity-0 !pointer-events-none" />}
              </div>
            );
          })}
        </div>

        {/* Collapse toggle footer */}
        <div
          className="flex cursor-pointer items-center justify-center border-t border-gray-100 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(id);
          }}
          title={showingDetailed ? "Collapse table" : "Expand table"}
        >
          {showingDetailed ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
        </div>
      </div>

      {hoveredField && tooltipPos && createPortal(
        <div
          className="fixed z-[9999] rounded-md bg-white px-2.5 py-1.5 text-[11px] text-gray-700 shadow-lg border border-gray-200 max-w-[260px] break-words pointer-events-none"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {allFields.find((f) => f.name === hoveredField)?.description}
        </div>,
        document.body,
      )}
    </div>
  </>);
}, (prev, next) => {
  return prev.selected === next.selected && prev.id === next.id && prev.data === next.data;
});
