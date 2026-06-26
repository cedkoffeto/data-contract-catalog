"use client";

import { useEffect, useState } from "react";
import { DataModelEditor } from "@/src/components/data-model/DataModelEditor";
import type { DataModelContract, LoadedModel } from "@/src/lib/data-model";

export function DataModelClient() {
  const [contracts, setContracts] = useState<DataModelContract[] | null>(null);
  const [models, setModels] = useState<LoadedModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/data-model")
      .then((r) => r.json())
      .then((data) => {
        setContracts(data.contracts);
        setModels(data.models);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load data"));
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!contracts || !models) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Loading data model…
      </div>
    );
  }

  return <DataModelEditor contracts={contracts} models={models} />;
}
