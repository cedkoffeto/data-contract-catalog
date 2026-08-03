"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ExternalLink, Key } from "lucide-react";
import type { Edge } from "@xyflow/react";
import type { DataModelContract } from "@/src/lib/data-model";

const maturityBadge: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-slate-100 text-slate-600",
  gold:   "bg-yellow-100 text-yellow-700",
};

function contractId(c: DataModelContract): string {
  return `${c.maturity}_${c.slug}`;
}

function fieldFromHandle(handle: string | null | undefined): string {
  if (!handle) return "";
  for (const suffix of ["-left-out", "-right-in", "-right", "-left"]) {
    if (handle.endsWith(suffix)) return handle.slice(0, -suffix.length);
  }
  return handle;
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
  const [panelWidth, setPanelWidth] = useState(900);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    setTab("fields");
    setQuery("");
  }, [contract]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (contract) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [contract, onClose]);

  useEffect(() => {
    if (!resizingRef.current) return;
    function handleMove(e: MouseEvent) {
      const delta = e.clientX - startXRef.current;
      setPanelWidth(Math.min(1400, Math.max(360, startWidthRef.current + delta)));
    }
    function handleUp() { resizingRef.current = false; }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, []);

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
        if (other) inc.push({ edge: e, other, field: fieldFromHandle(e.targetHandle) });
      }
      if (e.source === id) {
        const other = contractLookup.get(e.target);
        if (other) out.push({ edge: e, other, field: fieldFromHandle(e.sourceHandle) });
      }
    }
    return { incoming: inc, outgoing: out };
  }, [contract, edges, contractLookup]);

  const connectedFields = useMemo(() => {
    const set = new Set<string>();
    for (const { field } of incoming) set.add(field);
    for (const { field } of outgoing) set.add(field);
    return set;
  }, [incoming, outgoing]);

  const panelErrors = useMemo(
    () => [...(contract?.relationErrors ?? []), ...(contract?.primaryKeyErrors ?? [])],
    [contract?.relationErrors, contract?.primaryKeyErrors],
  );

  if (!contract) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] flex-col rounded-lg bg-white shadow-xl overflow-hidden relative"
        style={{ width: panelWidth, maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors"
          onMouseDown={(e) => { resizingRef.current = true; startXRef.current = e.clientX; startWidthRef.current = panelWidth; }}
        />
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 truncate text-base font-semibold text-gray-900">
              <span className="truncate">{contract.name}</span>
              {panelErrors.length > 0 && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                  title={panelErrors.map((e) => e.message).join("\n")}
                />
              )}
            </h3>
            <p className="truncate text-xs text-gray-500 font-mono">{contract.slug}</p>
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
                <>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-2 text-left whitespace-nowrap">Field Name</th>
                        <th className="px-4 py-2 text-left whitespace-nowrap">Data Type</th>
                        <th className="w-full px-4 py-2 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredFields.map((f) => (
                        <tr key={f.name} className="hover:bg-gray-50">
                          <td className={`px-4 py-2.5 break-words align-top ${connectedFields.has(f.name) ? "font-semibold text-gray-900" : "text-gray-600"}`} title={f.name}>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-mono">{f.name}</span>
                              {connectedFields.has(f.name) && <Key size={10} className="shrink-0 text-amber-500" />}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-600 break-words align-top" title={f.type}>{f.type}</td>
                          <td className="w-full px-4 py-2.5 text-gray-600 break-words align-top" title={f.description ?? ""}>{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Link */}
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
              <button
                onClick={() => window.open(`/contracts/${contract.slug}`, "_blank", "noopener,noreferrer")}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
              >
                <ExternalLink size={12} />
                Open contract detail
              </button>
              <span className="text-[11px] text-gray-400">{contract.fields.length} field{contract.fields.length !== 1 ? "s" : ""}</span>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Metadata row */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-xs text-gray-600">
              <span className={`rounded px-1 py-0.5 text-[11px] font-semibold ${maturityBadge[contract.maturity] || maturityBadge.bronze}`}>
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

            {/* Lineage block */}
            {(incoming.length > 0 || outgoing.length > 0) && (
              <div className="border-t border-gray-100 px-4 py-3">
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Lineage</h4>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wide text-orange-700 mb-1.5">Upstream</h5>
                    <div className="space-y-1">
                      {incoming.length > 0 ? incoming.map(({ edge, other }) => (
                        <button
                          key={edge.id}
                          onClick={() => onCenterView?.(contractId(other))}
                          className="block w-full rounded border border-orange-300 bg-white px-2 py-1 text-[11px] text-gray-700 text-left hover:bg-orange-50 transition-colors font-mono truncate"
                        >
                          {other.slug}
                        </button>
                      )) : (
                        <span className="text-[11px] text-gray-400 italic">None</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    <svg className="h-4 w-4 shrink-0 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m-5-5 5 5-5 5" />
                    </svg>
                    <span className="max-w-[120px] truncate rounded border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] font-semibold text-gray-800" title={contract.slug}>
                      {contract.slug}
                    </span>
                    <svg className="h-4 w-4 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m-5-5 5 5-5 5" />
                    </svg>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wide text-blue-700 mb-1.5">Downstream</h5>
                    <div className="space-y-1">
                      {outgoing.length > 0 ? outgoing.map(({ edge, other }) => (
                        <button
                          key={edge.id}
                          onClick={() => onCenterView?.(contractId(other))}
                          className="block w-full rounded border border-blue-300 bg-white px-2 py-1 text-[11px] text-gray-700 text-left hover:bg-blue-50 transition-colors font-mono truncate"
                        >
                          {other.slug}
                        </button>
                      )) : (
                        <span className="text-[11px] text-gray-400 italic">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}