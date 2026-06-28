"use client";

import { memo, useContext, useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Table, Key } from "lucide-react";
import { ViewModeCtx } from "./ModelGraph";

export type ContractTableNodeData = Record<string, unknown> & {
  label: string;
  slug: string;
  maturity: "bronze" | "silver" | "gold";
  domain: string;
  context?: string;
  fields: { name: string; type: string }[];
  color: string;
  onHeaderClick?: (slug: string) => void;
  onFieldClick?: (slug: string) => void;
};

const maturityBadge: Record<string, string> = {
  bronze: "bg-amber-600 text-white border-amber-700",
  silver: "bg-slate-400 text-white border-slate-500",
  gold:   "bg-yellow-500 text-white border-yellow-600",
};

export const ContractTableNode = memo(function ContractTableNode({ selected, id, data }: NodeProps) {
  const d = data as ContractTableNodeData;
  const { viewMode, connectedFields, onHeaderClick, onFieldClick } = useContext(ViewModeCtx);
  const allFields = d.fields as { name: string; type: string }[];
  const nodeConnected = connectedFields.get(id);
  const connectedSet = nodeConnected ?? new Set<string>();

  const fields = useMemo(() => {
    if (viewMode === "detailed") return allFields;
    return allFields.filter((f) => connectedSet.has(f.name));
  }, [allFields, viewMode, connectedSet]);

  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-xl transition-shadow hover:shadow-2xl ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : ""
      }`}
      style={{
        minWidth: 220,
        maxWidth: 300,
        borderColor: selected ? undefined : d.color,
        boxShadow: selected
          ? "0 10px 25px -5px rgba(0,0,0,0.15), 0 4px 10px -6px rgba(0,0,0,0.1)"
          : `0 8px 20px -6px ${d.color}40, 0 2px 6px -2px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 rounded-t-[10px] px-3 py-2.5 text-white"
        style={{ backgroundColor: d.color }}
        onClick={() => onHeaderClick(d.slug)}
      >
        <Table size={15} />
        <span className="truncate text-sm font-semibold tracking-tight" title={`${d.label}\ndomain: ${d.domain}\ncontext: ${d.context ?? ""}\nslug: ${d.slug}`}>{d.slug}</span>
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none ${maturityBadge[d.maturity as string] || maturityBadge.bronze}`}>
          {d.maturity as string}
        </span>
      </div>

      {/* Fields */}
      <div className="divide-y divide-gray-100">
        {fields.length === 0 && (
          <div className="px-3 py-2 text-xs italic text-gray-400">No fields</div>
        )}
        {fields.map((f) => {
          const isConnected = connectedSet.has(f.name);
          return (
            <div key={f.name} className="relative flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50" onClick={() => onFieldClick?.(d.slug)}>
              <Handle type="target" position={Position.Left} id={f.name} className="!opacity-0 !pointer-events-none" />
              {isConnected ? (
                <Key size={11} className="shrink-0 text-amber-500" />
              ) : (
                <span className="w-[11px] shrink-0" />
              )}
              <span className="font-mono text-[11px] font-medium">{f.name}</span>
              <span className="ml-auto text-[10px] text-gray-400">{f.type}</span>
              <Handle type="source" position={Position.Right} id={f.name} className="!opacity-0 !pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
});
