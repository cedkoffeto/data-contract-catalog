"use client";

import type { DataContract } from "@/src/lib/types";

function nodes(values: string[] | undefined) {
  return (values ?? []).filter(Boolean);
}

export function LineageGraph({ data }: { data: DataContract }) {
  const upstream = nodes(data.lineage?.upstream);
  const downstream = nodes(data.lineage?.downstream);

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
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-orange-700">Upstream</h3>
              <div className="space-y-2">
                {upstream.map((item) => (
                  <div key={`up-${item}`} className="rounded-lg border border-orange-400 bg-white px-3 py-2 text-sm text-gray-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <svg className="h-10 w-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m-5-5 5 5-5 5" />
              </svg>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">Downstream</h3>
              <div className="space-y-2">
                {downstream.map((item) => (
                  <div key={`down-${item}`} className="rounded-lg border border-blue-400 bg-white px-3 py-2 text-sm text-gray-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
