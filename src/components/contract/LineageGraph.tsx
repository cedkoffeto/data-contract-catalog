"use client";

import { useEffect, useRef, useState } from "react";
import type { DataContract } from "@/src/lib/types";

function useRailInset() {
  const ref = useRef<SVGSVGElement | null>(null);
  const [inset, setInset] = useState(6);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setInset(Math.max(3, Math.min(14, Math.ceil(175 / Math.max(el.clientHeight, 1)) + 1)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, inset };
}

function nodes(values: string[] | undefined) {
  return (values ?? []).filter(Boolean);
}

function SourceIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5M3.75 13.5h16.5M9 9v11.25M15 9v11.25" />
    </svg>
  );
}

function ConsumerIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

export function LineageGraph({ data, slug }: { data: DataContract; slug?: string }) {
  const upstream = nodes(data.lineage?.upstream);
  const downstream = nodes(data.lineage?.downstream);
  const { ref: railRef, inset: i } = useRailInset();

  if (upstream.length === 0 && downstream.length === 0) {
    return null;
  }

  return (
    <section id="lineage" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Lineage</h1>
        <p className="text-sm text-gray-500">Upstream sources and downstream consumers declared in the contract.</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-stretch gap-0">
            {/* Upstream */}
            <div className="flex-1 min-w-0 rounded-l-lg border border-orange-200 bg-orange-50/50 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <SourceIcon />
                <h3 className="text-xs font-semibold text-orange-700">Upstream</h3>
                <span className="ml-auto inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">{upstream.length}</span>
              </div>
              <div className="space-y-1.5">
                {upstream.map((item) => (
                  <div key={`up-${item}`} className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-gray-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    {item}
                  </div>
                ))}
                {upstream.length === 0 && (
                  <p className="text-xs text-orange-300 italic">No upstream sources</p>
                )}
              </div>
            </div>

            {/* Contract slug */}
            <div className="flex w-20 shrink-0 flex-col items-center justify-center px-2">
              <svg className="w-full flex-1" viewBox="0 0 80 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 0 2 H 40 V 100" stroke="#cbd5e1" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                <path d={`M ${i} ${Math.max(i, 2)} H ${40 - i} V ${100 - i}`} stroke="#fb923c" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0 14" fill="none" vectorEffect="non-scaling-stroke" style={{ animation: "dcc-lineage-dot 1.2s linear infinite" }} />
              </svg>
              <svg width="14" height="9" viewBox="0 0 14 9" className="mb-0.5 shrink-0" aria-hidden="true">
                <polygon points="0,0 14,0 7,9" fill="#fb923c" />
              </svg>
              <span className="relative max-w-[96px] truncate rounded-md border border-gray-200 bg-white px-2 py-1 text-center font-mono text-[11px] font-semibold text-gray-800" title={slug ?? ""}>
                {slug}
              </span>
              <svg ref={railRef} className="mt-0.5 w-full flex-1" viewBox="0 0 80 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M 40 0 V 100 H 80" stroke="#cbd5e1" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                <path d={`M 40 ${i} V ${100 - i} H ${80 - i}`} stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0 14" fill="none" vectorEffect="non-scaling-stroke" style={{ animation: "dcc-lineage-dot 1.2s linear infinite" }} />
              </svg>
              <svg width="9" height="14" viewBox="0 0 9 14" className="-mt-[7px] self-end shrink-0" aria-hidden="true">
                <polygon points="0,0 0,14 9,7" fill="#60a5fa" />
              </svg>
            </div>

            {/* Downstream */}
            <div className="flex-1 min-w-0 rounded-r-lg border border-blue-200 bg-blue-50/50 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <ConsumerIcon />
                <h3 className="text-xs font-semibold text-blue-700">Downstream</h3>
                <span className="ml-auto inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">{downstream.length}</span>
              </div>
              <div className="space-y-1.5">
                {downstream.map((item) => (
                  <div key={`down-${item}`} className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-gray-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    {item}
                  </div>
                ))}
                {downstream.length === 0 && (
                  <p className="text-xs text-blue-300 italic">No downstream consumers</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
