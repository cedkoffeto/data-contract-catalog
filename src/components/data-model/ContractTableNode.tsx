"use client";

import { memo, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Table, Key, ChevronUp, ChevronDown, Info } from "lucide-react";
import { ViewModeCtx } from "./ModelGraph";
import type { ContractTableNodeData } from "@/src/lib/data-model";

const layerBorderColor: Record<string, string> = {
  bronze: "#d97706",
  silver: "#64748b",
  gold:   "#ca8a04",
};

export const ContractTableNode = memo(function ContractTableNode({ selected, id, data }: NodeProps) {
  const d = data as ContractTableNodeData;
  const { viewMode, connectedFields, onHeaderClick, onFieldClick, searchMatchIds, collapsedTables, onToggleCollapse } = useContext(ViewModeCtx);
  const isSearchMatch = searchMatchIds?.has(id) ?? false;
  const allFields = d.fields;
  const nodeConnected = connectedFields.get(id);
  const connectedCount = nodeConnected ?? new Map<string, number>();
  const isConnected = (name: string) => (connectedCount.get(name) ?? 0) > 0;
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [errorHover, setErrorHover] = useState(false);
  const [errorTooltipPos, setErrorTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [headerHover, setHeaderHover] = useState(false);
  const [headerTooltipPos, setHeaderTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const errors = d.relationErrors;

  const collapsed = collapsedTables.has(id);
  const showingDetailed = viewMode === "detailed" ? !collapsed : collapsed;

  const fields = useMemo(() => {
    if (showingDetailed) return allFields;
    return allFields.filter((f) => isConnected(f.name));
  }, [allFields, showingDetailed, connectedCount]);

  return (
    <div
      className={`rounded-xl border-2 transition-shadow ${
        selected ? "border-blue-500 shadow-[0_4px_16px_rgba(0,0,0,0.1)]" : isSearchMatch ? "border-green-500 shadow-[0_4px_16px_rgba(0,0,0,0.1)]" : "border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
      }`}
      style={{ width: 260, position: "relative" }}
    >
      <Handle type="source" position={Position.Right} className="!w-0 !h-0 !border-0 !bg-transparent !opacity-0" />
      <Handle type="target" position={Position.Left} className="!w-0 !h-0 !border-0 !bg-transparent !opacity-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-0 !h-0 !border-0 !bg-transparent !opacity-0" />
      <Handle type="target" position={Position.Top} id="top" className="!w-0 !h-0 !border-0 !bg-transparent !opacity-0" />
      <div className="relative overflow-hidden rounded-xl bg-white">
        {/* Header */}
        <div className="flex min-w-0 cursor-grab active:cursor-grabbing items-center gap-2 py-2 pl-4 pr-2" style={{ background: d.color.replace("hsl(", "hsla(").replace(")", ", 0.1)"), borderBottom: `2px solid ${d.color}40`, borderLeft: `4px solid ${layerBorderColor[d.maturity as string] || layerBorderColor.bronze}` }}>
          <span className="flex h-5 cursor-pointer items-center" onClick={(e) => { e.stopPropagation(); window.open(`/contracts/${d.slug}`, "_blank", "noopener,noreferrer"); }} title="Open contract detail"><Table size={14} style={{ color: d.color }} /></span>
          <span className="flex h-5 min-w-0 items-center text-sm font-semibold tracking-tight text-gray-900"
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) { e.stopPropagation(); window.open(`/contracts/${d.slug}`, "_blank", "noopener,noreferrer"); }
              else onHeaderClick(d.slug);
            }}
            onMouseEnter={(e) => { setHeaderHover(true); const r = e.currentTarget.getBoundingClientRect(); setHeaderTooltipPos({ top: r.top - 6, left: r.right + 8 }); }}
            onMouseLeave={() => { setHeaderHover(false); setHeaderTooltipPos(null); }}
          ><span className="break-all leading-snug">{d.slug}</span></span>
          <button
            className="ml-auto flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded transition-all opacity-70 hover:opacity-100 hover:brightness-[.65] hover:bg-black/[0.08]"
            style={{ color: d.color }}
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(id); }}
            title={showingDetailed ? "Collapse table" : "Expand table"}
          >
            {showingDetailed ? <ChevronUp size={11} strokeWidth={1.5} /> : <ChevronDown size={11} strokeWidth={1.5} />}
          </button>
          {errors && errors.length > 0 && (
            <>
              <span
                className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center cursor-pointer"
                onMouseEnter={(e) => { e.stopPropagation(); setErrorHover(true); setHeaderHover(false); setHeaderTooltipPos(null); const r = e.currentTarget.getBoundingClientRect(); setErrorTooltipPos({ top: r.top - 6, left: r.right + 4 }); }}
                onMouseLeave={(e) => { e.stopPropagation(); setErrorHover(false); setErrorTooltipPos(null); }}
              >
                <span className="h-3 w-3 rounded-full bg-red-500" />
              </span>
              {errorHover && errorTooltipPos && createPortal(
                <div
                  className="editor-error-popover fixed"
                  style={{ left: errorTooltipPos.left, top: errorTooltipPos.top }}
                >
                  <div className="editor-error-popover-arrow" />
                  <div className="editor-error-popover-header">
                    <span>Relation errors</span>
                    <button className="editor-error-popover-close" onClick={() => { setErrorHover(false); setErrorTooltipPos(null); }}>&times;</button>
                  </div>
                  <div className="editor-error-popover-body">
                    {errors.map((e, i) => (
                      <div key={i} className={i < errors.length - 1 ? "border-b border-gray-100 pb-2 mb-2" : ""}>
                        <div className="text-[11px] font-semibold text-red-600">{e.message}</div>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body,
              )}
            </>
          )}
        </div>



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
            const c = connectedCount.get(f.name) ?? 0;
            const edgeCount = c > 0 ? c : 0;
            return (
              <div key={f.name} className="group relative flex min-w-0 cursor-pointer items-center gap-2 border-t border-gray-50 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50" onClick={(e) => {
                if (e.ctrlKey || e.metaKey) { e.stopPropagation(); window.open(`/contracts/${d.slug}`, "_blank", "noopener,noreferrer"); }
                else onFieldClick?.(d.slug);
              }}>
                {edgeCount > 0 ? (
                  <Key size={10} className="shrink-0 text-amber-500" />
                ) : (
                  <span className="w-[10px] shrink-0" />
                )}
                <span className={`min-w-0 font-mono text-[11px] leading-none break-all ${edgeCount > 0 ? "font-bold text-gray-900" : "text-gray-600"}`}>{f.name}</span>
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
              </div>
            );
          })}
        </div>
      </div>
      {hoveredField && tooltipPos && createPortal(
        <div
          className="editor-error-popover fixed"
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
        >
          <div className="editor-error-popover-arrow" />
          <div className="editor-error-popover-header">
            <span>{hoveredField}</span>
            <span className="ml-auto font-mono text-[10px] text-gray-400">{allFields.find((f) => f.name === hoveredField)?.type}</span>
          </div>
          <div className="editor-error-popover-body">
            <pre>{allFields.find((f) => f.name === hoveredField)?.description}</pre>
          </div>
        </div>,
        document.body,
      )}
      {headerHover && headerTooltipPos && createPortal(
        <div
          className="editor-error-popover fixed"
          style={{ left: headerTooltipPos.left, top: headerTooltipPos.top }}
        >
          <div className="editor-error-popover-arrow" />
          <div className="editor-error-popover-header">
            <span>{d.slug}</span>
          </div>
          <div className="editor-error-popover-body">
            <pre>{d.label}{'\n'}layer: {d.maturity}{'\n'}domain: {d.domain}{'\n'}context: {d.context ?? ''}{'\n'}id: {id}</pre>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}, (prev, next) => {
  return prev.selected === next.selected && prev.id === next.id && prev.data === next.data;
});
