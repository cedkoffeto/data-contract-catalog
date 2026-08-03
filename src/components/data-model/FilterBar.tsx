"use client";

import { Search, X } from "lucide-react";

export function FilterBar({
  query,
  onChange,
  total,
  visible,
}: {
  query: string;
  onChange: (q: string) => void;
  total: number;
  visible: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
      <Search size={16} className="shrink-0 text-gray-400" />
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by contract name or domain..."
        className="min-w-0 flex-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
      />
      {query && (
        <button onClick={() => onChange("")} className="shrink-0 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      )}
      <span className="shrink-0 text-xs text-gray-400">
        {visible} / {total}
      </span>
    </div>
  );
}
