"use client";

import type { Policy } from "./types";

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 3.5c4.08 0 7.47 2.9 8.23 6.75-.76 3.85-4.15 6.75-8.23 6.75s-7.47-2.9-8.23-6.75C2.53 6.4 5.92 3.5 10 3.5zm0 2C7.22 5.5 4.82 7.35 3.9 10c.92 2.65 3.32 4.5 6.1 4.5s5.18-1.85 6.1-4.5c-.92-2.65-3.32-4.5-6.1-4.5zm0 1.75A2.75 2.75 0 1110 12.75 2.75 2.75 0 0110 7.25z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13.586 2.586a2 2 0 012.828 0l.828.828a2 2 0 010 2.828l-9.172 9.172a2 2 0 01-1.068.566l-3.11.518a1 1 0 01-1.112-1.112l.518-3.11a2 2 0 01.566-1.068l9.172-9.172zM15.414 4.414a.5.5 0 00-.707 0l-1.06 1.06 1.768 1.768 1.06-1.06a.5.5 0 000-.707l-.828-.828z" />
    </svg>
  );
}

function formatScope(domain: string | null, context: string | null, dataContract?: string | null) {
  if (domain === null && context === null && !dataContract) return "All domains & contexts";
  if (context === null && !dataContract) return `Domain: ${domain}`;
  if (dataContract) return `${domain} / ${context} / ${dataContract}`;
  return `${domain} / ${context}`;
}

export default function PolicyTable({
  policies,
  filteredPolicies,
  search,
  onSearchChange,
  groupMap,
  onViewUser,
  onViewGroupMembers,
  onEdit,
  onDelete,
  currentUserId,
  minAdminUserId,
}: {
  policies: Policy[];
  filteredPolicies: Policy[];
  search: string;
  onSearchChange: (v: string) => void;
  groupMap: Map<number, string>;
  onViewUser: (userId: string) => void;
  onViewGroupMembers: (groupId: number, groupName: string) => void;
  onEdit: (p: Policy) => void;
  onDelete: (id: number) => void;
  currentUserId: string | null;
  minAdminUserId: string | null;
}) {
  function isProtected(p: Policy): boolean {
    if (!currentUserId || !minAdminUserId) return false;
    return p.user_id === minAdminUserId && currentUserId !== minAdminUserId;
  }
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          className="flex-1 rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter policies…"
        />
        <span className="whitespace-nowrap text-sm text-gray-400">
          {filteredPolicies.length} of {policies.length} policies
        </span>
      </div>

      {policies.length === 0 ? (
        <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
          No policies yet. Create one above.
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
          No policies match your filter.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border shadow-lg">
          <table className="w-full table-fixed divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                {(["id", "target", "permission_name", "scope"] as const).map((key) => {
                  const labels: Record<string, string> = { id: "ID", target: "Target", permission_name: "Permission", scope: "Scope" };
                  const widths: Record<string, string> = { id: "w-[8%]", target: "w-[32%]", permission_name: "w-[12%]", scope: "w-[30%]" };
                  return (
                    <th key={key} className={`${widths[key]} px-6 py-3 text-left font-medium text-gray-500`}>
                      {labels[key]}
                    </th>
                  );
                })}
                <th className="w-[18%] px-6 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPolicies.map((p) => {
                const groupName = p.group_name ?? groupMap.get(p.group_id ?? -1) ?? "";
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{p.id}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {p.user_id ? (
                        <span>
                          <span className="text-xs text-gray-400">user:</span>{" "}
                          <span className="font-medium text-gray-900">{p.user_id}</span>
                        </span>
                      ) : (
                        <span>
                          <span className="text-xs text-gray-400">group:</span>{" "}
                          <span className="font-medium text-gray-900">{groupName || `#${p.group_id}`}</span>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
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
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      <code className="text-xs">{formatScope(p.domain_scope, p.context_scope, p.data_contract_scope)}</code>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.user_id ? (
                          <button
                            onClick={() => onViewUser(p.user_id!)}
                            className="editor-soft-button"
                          >
                            <EyeIcon />
                            <span className="ml-1.5">View</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onViewGroupMembers(p.group_id!, groupName)}
                            className="editor-soft-button"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                            </svg>
                            <span className="ml-1.5">Members</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(p)}
                          className="editor-soft-button"
                          disabled={isProtected(p)}
                          title={isProtected(p) ? "Cannot modify primary admin's policies" : undefined}
                          style={{ opacity: isProtected(p) ? 0.4 : 1, cursor: isProtected(p) ? "not-allowed" : "pointer" }}
                        >
                          <PencilIcon />
                          <span className="ml-1.5">Edit</span>
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          className="rounded-md px-3 py-1.5 text-sm font-bold text-white"
                          style={{ backgroundColor: isProtected(p) ? "#9ca3af" : "#dc2626", cursor: isProtected(p) ? "not-allowed" : "pointer" }}
                          disabled={isProtected(p)}
                          title={isProtected(p) ? "Cannot modify primary admin's policies" : undefined}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
