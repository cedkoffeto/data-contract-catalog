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
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Lineage</h2>
        <p className="mt-1 text-sm text-gray-500">Upstream sources and downstream consumers declared in the contract.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-700">Upstream</h3>
          <div className="space-y-2">
            {upstream.map((item) => (
              <div key={`up-${item}`} className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700">
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

        <div className="rounded-xl border border-green-100 bg-green-50 p-3">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-green-700">Downstream</h3>
          <div className="space-y-2">
            {downstream.map((item) => (
              <div key={`down-${item}`} className="rounded-lg border border-green-100 bg-white px-3 py-2 text-sm text-gray-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
