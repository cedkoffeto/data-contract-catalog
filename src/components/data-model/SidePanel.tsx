"use client";

import { useState, useMemo } from "react";
import { X, Search, ExternalLink, ArrowRight, ArrowLeft } from "lucide-react";
import type { DataModelContract } from "@/src/lib/data-model";
import type { Edge } from "@xyflow/react";

const maturityBadge: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-100 text-slate-600",
  gold:   "bg-yellow-100 text-yellow-700",
};

function contractId(c: DataModelContract): string {
  return `${c.maturity}_${c.slug}`;
}

export function SidePanel({
  contract,
  contracts,
  edges,
  onClose,
  onCenterView,
}: {
  contract: DataModelContract | null;
  contracts: DataModelContract[];
  edges: Edge[];
  onClose: () => void;
  onCenterView?: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredFields = useMemo(() => {
    if (!query) return contract?.fields ?? [];
    const q = query.toLowerCase();
    return (contract?.fields ?? []).filter(
      (f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q),
    );
  }, [contract, query]);

  const contractLookup = useMemo(() => {
    const map = new Map<string, DataModelContract>();
    for (const c of contracts) {
      map.set(contractId(c), c);
    }
    return map;
  }, [contracts]);

  const { incoming, outgoing } = useMemo(() => {
    if (!contract) return { incoming: [], outgoing: [] };
    const id = contractId(contract);
    const inc: { edge: Edge; other: DataModelContract; field: string }[] = [];
    const out: { edge: Edge; other: DataModelContract; field: string }[] = [];

    for (const e of edges) {
      if (e.target === id) {
        const other = contractLookup.get(e.source);
        if (other) inc.push({ edge: e, other, field: (e.targetHandle as string) || "" });
      }
      if (e.source === id) {
        const other = contractLookup.get(e.target);
        if (other) out.push({ edge: e, other, field: (e.sourceHandle as string) || "" });
      }
    }
    return { incoming: inc, outgoing: out };
  }, [contract, edges, contractLookup]);

  if (!contract) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-40 bg-black/15" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-gray-900">{contract.name}</h2>
            <p className="truncate text-[11px] text-gray-500 font-mono">{contract.slug}</p>
          </div>
          <button onClick={onClose} className="ml-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Metadata row */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-xs text-gray-600">
            <span className={`rounded px-1 py-0.5 text-[10px] font-semibold ${maturityBadge[contract.maturity] || maturityBadge.bronze}`}>
              {contract.maturity}
            </span>
            <span>{contract.domain}</span>
            <span className="text-gray-400">{contract.context}</span>
          </div>

          {/* Description */}
          {contract.description && (
            <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-600 leading-relaxed">
              {contract.description}
            </div>
          )}

          {/* Link to contract detail */}
          <a
            href={`/${contract.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <ExternalLink size={12} />
            Open contract detail
          </a>

          {/* Relations */}
          {(incoming.length > 0 || outgoing.length > 0) && (
            <div className="border-b border-gray-100 px-4 py-2">
              {outgoing.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Outgoing ({outgoing.length})
                  </h3>
                  <div className="space-y-1">
                    {outgoing.map(({ edge, other, field }) => (
                      <button
                        key={edge.id}
                        onClick={() => onCenterView?.(contractId(other))}
                        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-left hover:bg-gray-50 transition-colors"
                      >
                        <ArrowRight size={10} className="shrink-0 text-amber-500" />
                        <span className="font-mono text-gray-700 truncate">{other.slug}</span>
                        <span className="ml-auto text-[10px] text-gray-400 truncate">{edge.label as string}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {incoming.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Incoming ({incoming.length})
                  </h3>
                  <div className="space-y-1">
                    {incoming.map(({ edge, other, field }) => (
                      <button
                        key={edge.id}
                        onClick={() => onCenterView?.(contractId(other))}
                        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-left hover:bg-gray-50 transition-colors"
                      >
                        <ArrowLeft size={10} className="shrink-0 text-blue-500" />
                        <span className="font-mono text-gray-700 truncate">{other.slug}</span>
                        <span className="ml-auto text-[10px] text-gray-400 truncate">{edge.label as string}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Field search */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-1.5">
            <Search size={12} className="shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fields..."
              className="min-w-0 flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Fields list */}
          <div className="flex-1 overflow-y-auto">
            {filteredFields.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                {query ? "No fields match your search" : "No fields"}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredFields.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-gray-50">
                    <span className="font-mono font-medium text-gray-900">{f.name}</span>
                    <span className="ml-auto text-[11px] text-gray-400">{f.type}</span>
                    {f.description && (
                      <span className="text-[10px] text-gray-400 truncate max-w-[100px]" title={f.description}>
                        {f.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes dcc-turbo-spin {
            100% { transform: translate(-50%, -50%) rotate(-360deg); }
          }
        `}</style>
      </div>
    </>
  );
}