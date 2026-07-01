"use client";

import { memo, useContext, useEffect, useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Table, Key } from "lucide-react";
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
  const { viewMode, connectedFields, onHeaderClick, onFieldClick, searchMatchIds } = useContext(ViewModeCtx);
  const isSearchMatch = searchMatchIds?.has(id) ?? false;
  const allFields = d.fields;
  const nodeConnected = connectedFields.get(id);
  const connectedSet = nodeConnected ?? new Set<string>();

  const fields = useMemo(() => {
    if (viewMode === "detailed") return allFields;
    return allFields.filter((f) => connectedSet.has(f.name));
  }, [allFields, viewMode, connectedSet]);

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

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 shadow-md transition-shadow hover:shadow-lg ${
        selected ? "ring-2 ring-blue-500" : isSearchMatch ? "ring-2 ring-green-500" : ""
      }`}
      style={{
        minWidth: 220,
        maxWidth: 320,
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
      <div className="relative rounded-[14px] bg-white">
        {/* Color accent strip */}
        <div style={{ height: 4, backgroundColor: d.color }} />

        {/* Header */}
        <div className="flex min-w-0 cursor-grab active:cursor-grabbing items-center gap-2 px-3 py-2">
          <span className="flex h-5 cursor-pointer items-center" onClick={(e) => { e.stopPropagation(); onHeaderClick(d.slug); }} title="Open contract detail"><Table size={14} style={{ color: d.color }} /></span>
          <span className="flex h-5 min-w-0 items-center text-sm font-semibold tracking-tight text-gray-900" title={`${d.label}\ndomain: ${d.domain}\ncontext: ${d.context ?? ""}\nslug: ${d.slug}`}><span className="truncate">{d.slug}</span></span>
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
          {viewMode === "compact" && allFields.length > fields.length && (
            <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-50">
              {fields.length} connected · {allFields.length - fields.length} hidden
            </div>
          )}
          {fields.map((f) => {
            const isConnected = connectedSet.has(f.name);
            return (
              <div key={f.name} className="relative flex min-w-0 cursor-pointer items-center gap-2 border-t border-gray-50 px-3 py-[7px] text-xs text-gray-700 hover:bg-gray-50" onClick={() => onFieldClick?.(d.slug)}>
                {isConnected && <Handle type="target" position={Position.Left} id={f.name} className="!w-1.5 !h-1.5 !border-2 !border-gray-400 !bg-white" style={{ left: -1 }} />}
                {isConnected ? (
                  <Key size={10} className="shrink-0 text-amber-500" />
                ) : (
                  <span className="w-[10px] shrink-0" />
                )}
                <span className={`min-w-0 font-mono text-[11px] leading-none ${isConnected ? "font-bold text-gray-900" : "text-gray-600"}`}><span className="truncate">{f.name}</span></span>
                <span className="ml-auto min-w-0 text-[10px] leading-none text-gray-400"><span className="truncate">{f.type}</span></span>
                {isConnected && <Handle type="source" position={Position.Right} id={f.name} className="!w-1.5 !h-1.5 !border-2 !border-gray-400 !bg-white" style={{ right: -1 }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.selected === next.selected && prev.id === next.id && prev.data === next.data;
});
