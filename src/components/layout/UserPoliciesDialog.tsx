import { useEffect, useState } from "react";

import type { AccessPolicyRecord } from "@/src/lib/access-control";

type PolicyWithSource = AccessPolicyRecord & { source: "direct" | "group" };

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
  const [policies, setPolicies] = useState<PolicyWithSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/policies/effective?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data: { items: AccessPolicyRecord[] }) => {
        const items = data.items ?? [];
        const withSource: PolicyWithSource[] = items.map((p) => ({
          ...p,
          source: p.group_id !== null && p.group_id !== undefined ? "group" : "direct",
        }));
        setPolicies(withSource);
      })
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const directPolicies = policies.filter((p) => p.source === "direct");
  const groupPolicies = policies.filter((p) => p.source === "group");

  return (
    <div className="user-policies-dialog">
      <div className="user-policies-dialog__overlay" onClick={onClose} />
      <div
        className="user-policies-dialog__content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-policies-title"
      >
        <h3 id="user-policies-title" className="text-base font-semibold text-gray-900">
          Access policies for: <span className="font-mono text-sm">{userId}</span>
        </h3>

        <p className="mt-1 text-xs text-gray-400">{policies.length} polic{policies.length !== 1 ? "ies" : "y"}</p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        ) : policies.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No policies found. Contact your administrator for access.</p>
        ) : (
          <div className="mt-3 max-h-72 overflow-y-auto">
            {directPolicies.length > 0 ? (
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Direct policies</p>
                <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="pb-1 pr-2">Permission</th>
                      <th className="pb-1">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directPolicies.map((p) => (
                      <tr key={p.id} className="text-gray-700">
                        <td className="py-1 pr-2">
                          <span
                            className="rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{
                              background:
                                p.permission_name === "admin"
                                  ? "#fef2f2"
                                  : p.permission_name === "editor"
                                    ? "#fff7ed"
                                    : "#f0f9ff",
                              color:
                                p.permission_name === "admin"
                                  ? "#dc2626"
                                  : p.permission_name === "editor"
                                    ? "#f97316"
                                    : "#2563eb",
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
            ) : null}

            {groupPolicies.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Group policies</p>
                <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="pb-1 pr-2">Permission</th>
                      <th className="pb-1">Group</th>
                      <th className="pb-1">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupPolicies.map((p) => (
                      <tr key={p.id} className="text-gray-700">
                        <td className="py-1 pr-2">
                          <span
                            className="rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{
                              background:
                                p.permission_name === "admin"
                                  ? "#fef2f2"
                                  : p.permission_name === "editor"
                                    ? "#fff7ed"
                                    : "#f0f9ff",
                              color:
                                p.permission_name === "admin"
                                  ? "#dc2626"
                                  : p.permission_name === "editor"
                                    ? "#f97316"
                                    : "#2563eb",
                            }}
                          >
                            {p.permission_name}
                          </span>
                        </td>
                        <td className="py-1 text-xs font-mono">{p.group_name ?? ""}</td>
                        <td className="py-1 text-xs">{formatScope(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
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