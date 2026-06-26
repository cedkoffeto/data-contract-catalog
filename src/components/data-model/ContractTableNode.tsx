"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Table, Key, Braces } from "lucide-react";

export type ContractTableNodeData = {
  label: string;
  slug: string;
  maturity: "bronze" | "silver" | "gold";
  domain: string;
  fields: { name: string; type: string }[];
  color: string;
  selected?: boolean;
  onHeaderClick?: (slug: string) => void;
};

const maturityBadge: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800 border-amber-300",
  silver: "bg-slate-100 text-slate-800 border-slate-300",
  gold:   "bg-yellow-100 text-yellow-800 border-yellow-400",
};

export const ContractTableNode = memo(function ContractTableNode({ data }: NodeProps<ContractTableNodeData>) {
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md transition-shadow hover:shadow-lg ${
        data.selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
      }`}
      style={{ minWidth: 200, maxWidth: 280 }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 rounded-t-lg px-3 py-2 text-white"
        style={{ backgroundColor: data.color }}
        onClick={() => data.onHeaderClick?.(data.slug)}
      >
        <Table size={14} />
        <span className="truncate text-sm font-semibold">{data.label}</span>
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none ${maturityBadge[data.maturity] || maturityBadge.bronze}`}>
          {data.maturity}
        </span>
      </div>

      {/* Fields */}
      <div className="divide-y divide-gray-100">
        {data.fields.map((f) => (
          <div key={f.name} className="relative flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700">
            <Handle
              type="source"
              position={Position.Right}
              id={f.name}
              className="!h-2 !w-2 !border-2 !border-gray-400 !bg-white"
              style={{ right: -5 }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id={f.name}
              className="!h-2 !w-2 !border-2 !border-gray-400 !bg-white"
              style={{ left: -5 }}
            />
            <Key size={10} className="shrink-0 text-amber-500" />
            <span className="font-mono">{f.name}</span>
            <span className="ml-auto text-[10px] text-gray-400">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
