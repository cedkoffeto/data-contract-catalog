"use client";

import { useEffect, useState } from "react";

import type { AccessPolicyRecord } from "@/src/lib/access-control";

function formatScope(policy: AccessPolicyRecord): string {
  if (policy.domain_scope === null && policy.context_scope === null && policy.data_contract_scope === null) {
    return "Global (all domains)";
  }
  if (policy.domain_scope && policy.context_scope === null && policy.data_contract_scope === null) {
    return `Domain: ${policy.domain_scope}`;
  }
  if (policy.domain_scope && policy.context_scope && policy.data_contract_scope === null) {
    return `${policy.domain_scope} / ${policy.context_scope}`;
  }
  return `${policy.domain_scope} / ${policy.context_scope} / ${policy.data_contract_scope}`;
}

export function UserPoliciesDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [policies, setPolicies] = useState<AccessPolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/policies/effective?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setPolicies(data.items ?? []))
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl" style={{ width: "min(70vw, 500px)" }}>
        <h3 className="text-base font-semibold text-gray-900">
          Access policies for: <span className="font-mono text-sm">{userId}</span>
        </h3>

        <p className="mt-1 text-xs text-gray-400">{policies.length} polic{policies.length !== 1 ? "ies" : "y"}</p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        ) : policies.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No policies found. Contact your administrator for access.</p>
        ) : (
          <div className="mt-3 max-h-72 overflow-y-auto">
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="pb-1 pr-2">Permission</th>
                  <th className="pb-1">Scope</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="text-gray-700">
                    <td className="py-1 pr-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: p.permission_name === "admin" ? "#fef2f2" : p.permission_name === "editor" ? "#fff7ed" : "#f0f9ff",
                          color: p.permission_name === "admin" ? "#dc2626" : p.permission_name === "editor" ? "#f97316" : "#2563eb",
                        }}
                      >
                        {p.permission_name}
                      </span>
                    </td>
                    <td className="py-1 text-xs">{formatScope(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}