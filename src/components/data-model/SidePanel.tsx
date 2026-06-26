"use client";

import { X } from "lucide-react";
import type { DataModelContract } from "@/src/lib/data-model";

export function SidePanel({
  contract,
  onClose,
}: {
  contract: DataModelContract | null;
  onClose: () => void;
}) {
  if (!contract) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md border-l border-gray-200 bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{contract.name}</h2>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{contract.slug}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Metadata */}
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Metadata</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Maturity</dt>
                  <dd className="font-medium text-gray-900 capitalize">{contract.maturity}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Domain</dt>
                  <dd className="font-medium text-gray-900">{contract.domain}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Context</dt>
                  <dd className="font-medium text-gray-900">{contract.context}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Slug</dt>
                  <dd className="font-medium text-gray-900 font-mono text-xs">{contract.slug}</dd>
                </div>
              </dl>
            </section>

            {/* Fields */}
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Fields ({contract.fields.length})</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {contract.fields.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="font-mono text-gray-900">{f.name}</span>
                    <span className="ml-auto text-xs text-gray-400">{f.type}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
