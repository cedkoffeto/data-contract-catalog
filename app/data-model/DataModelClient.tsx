"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { DataModelContract, LoadedModel } from "@/src/lib/data-model";

const DataModelEditor = dynamic(
  () => import("@/src/components/data-model/DataModelEditor").then((m) => m.DataModelEditor),
  { ssr: false },
);

function LoadingSkeleton() {
  return (
    <div className="flex h-full flex-col p-6 animate-pulse">
      <div className="flex gap-4 mb-4">
        <div className="h-8 w-48 rounded-md bg-gray-200" />
        <div className="h-8 w-32 rounded-md bg-gray-200" />
        <div className="h-8 w-32 rounded-md bg-gray-200" />
      </div>
      <div className="flex flex-1 gap-4">
        <div className="w-72 rounded-lg bg-gray-100" />
        <div className="flex-1 rounded-lg bg-gray-50" />
      </div>
    </div>
  );
}

export function DataModelClient({ focusSlug }: { focusSlug: string | null }) {
  const [contracts, setContracts] = useState<DataModelContract[] | null>(null);
  const [models, setModels] = useState<LoadedModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/data-model")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setContracts(data.contracts);
        setModels(data.models ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load data");
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchData}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading || !contracts) {
    return <LoadingSkeleton />;
  }

  return <DataModelEditor contracts={contracts} models={models} focusSlug={focusSlug} />;
}
