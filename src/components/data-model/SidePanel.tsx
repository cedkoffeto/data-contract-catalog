"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowRight, ArrowLeft, ExternalLink } from "lucide-react";
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
  const [tab, setTab] = useState<"fields" | "details">("fields");
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (contract) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [contract, onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex h-[65vh] flex-col rounded-lg bg-white shadow-xl"
        style={{ width: "min(65vw, 800px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-gray-900">{contract.name}</h3>
            <p className="truncate text-[11px] text-gray-500 font-mono">{contract.slug}</p>
          </div>
          <button onClick={onClose} className="editor-close-button" aria-label="Close" type="button">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="border-b border-gray-100 px-4 py-1.5">
          <div className="editor-tabs">
            <button
              onClick={() => setTab("fields")}
              className={`editor-tabs__item${tab === "fields" ? " is-active" : ""}`}
            >
              Fields
            </button>
            <button
              onClick={() => setTab("details")}
              className={`editor-tabs__item${tab === "details" ? " is-active" : ""}`}
            >
              Details
            </button>
          </div>
        </div>

        {/* Tab content */}
        {tab === "fields" ? (
          <>
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

            {/* Link */}
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
              <button
                onClick={() => window.open(`/${contract.slug}`, "_blank", "noopener,noreferrer")}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <ExternalLink size={12} />
                Open contract detail
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
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

            {/* Relations */}
            {(incoming.length > 0 || outgoing.length > 0) && (
              <div className="px-4 py-1.5">
                {outgoing.length > 0 && (
                  <div className="mb-1.5">
                    <h3 className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                      Outgoing ({outgoing.length})
                    </h3>
                    <div className="space-y-0.5">
                      {outgoing.map(({ edge, other }) => (
                        <button
                          key={edge.id}
                          onClick={() => onCenterView?.(contractId(other))}
                          className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-left hover:bg-gray-50 transition-colors"
                        >
                          <ArrowRight size={8} className="shrink-0 text-amber-500" />
                          <span className="font-mono text-gray-700 truncate">{other.slug}</span>
                          <span className="ml-auto text-[9px] text-gray-400 truncate">{edge.label as string}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {incoming.length > 0 && (
                  <div>
                    <h3 className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                      Incoming ({incoming.length})
                    </h3>
                    <div className="space-y-0.5">
                      {incoming.map(({ edge, other }) => (
                        <button
                          key={edge.id}
                          onClick={() => onCenterView?.(contractId(other))}
                          className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-left hover:bg-gray-50 transition-colors"
                        >
                          <ArrowLeft size={8} className="shrink-0 text-blue-500" />
                          <span className="font-mono text-gray-700 truncate">{other.slug}</span>
                          <span className="ml-auto text-[9px] text-gray-400 truncate">{edge.label as string}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}