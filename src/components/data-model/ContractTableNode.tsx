"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Table, Key, ArrowRight } from "lucide-react";

export type ContractTableNodeData = Record<string, unknown> & {
  label: string;
  slug: string;
  maturity: "bronze" | "silver" | "gold";
  domain: string;
  fields: { name: string; type: string }[];
  color: string;
  onHeaderClick?: (slug: string) => void;
};

const maturityBadge: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800 border-amber-300",
  silver: "bg-slate-100 text-slate-800 border-slate-300",
  gold:   "bg-yellow-100 text-yellow-800 border-yellow-400",
};

export const ContractTableNode = memo(function ContractTableNode({ selected, data }: NodeProps) {
  const d = data as ContractTableNodeData;
  const fields = d.fields as { name: string; type: string }[];
  return (
    <div
      className={`rounded-xl border-2 bg-white shadow-lg transition-shadow hover:shadow-xl ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"
      }`}
      style={{ minWidth: 220, maxWidth: 300 }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 rounded-t-[10px] px-3 py-2.5 text-white"
        style={{ backgroundColor: d.color }}
        onClick={() => d.onHeaderClick?.(d.slug)}
      >
        <Table size={15} />
        <span className="truncate text-sm font-semibold tracking-tight">{d.label}</span>
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none ${maturityBadge[d.maturity as string] || maturityBadge.bronze}`}>
          {d.maturity as string}
        </span>
      </div>

      {/* Fields header */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        <span>Column</span>
        <span className="ml-auto">Type</span>
      </div>

      {/* Fields */}
      <div className="divide-y divide-gray-100">
        {fields.length === 0 && (
          <div className="px-3 py-2 text-xs italic text-gray-400">No fields</div>
        )}
        {fields.map((f) => (
          <div key={f.name} className="relative flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
            <Handle
              type="source"
              position={Position.Right}
              id={f.name}
              className="!h-2.5 !w-2.5 !border-2 !border-gray-400 !bg-white"
              style={{ right: -6 }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id={f.name}
              className="!h-2.5 !w-2.5 !border-2 !border-gray-400 !bg-white"
              style={{ left: -6 }}
            />
            <Key size={11} className="shrink-0 text-amber-500" />
            <span className="font-mono text-[11px] font-medium">{f.name}</span>
            <span className="ml-auto text-[10px] text-gray-400">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
