"use client";

import { useMemo, useState } from "react";
import type { Policy } from "./types";
import { t, tWith } from "@/src/lib/i18n";

type SortKey = "id" | "target" | "permission_name" | "scope";
type SortDir = "asc" | "desc";

const PERMISSION_RANK: Record<string, number> = { reader: 1, editor: 2, admin: 3 };

function sortArrows(active: boolean, dir: SortDir) {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ color: active ? "#2563eb" : "#9ca3af" }}
    >
      {active ? (
        <path
          d={dir === "asc" ? "M10 4l5 6H5l5-6z" : "M10 16l5-6H5l5 6z"}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      ) : (
        <path d="M5 8l5-5 5 5M5 12l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

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
  if (domain === null && context === null && !dataContract) return t("allDomainsAndContexts");
  if (context === null && !dataContract) return tWith("scopeDomain", { domain: domain ?? "" });
  if (dataContract) return tWith("scopeFull", { domain: domain ?? "", context: context ?? "", contract: dataContract });
  return tWith("scopeDomainContext", { domain: domain ?? "", context: context ?? "" });
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
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function scopeDepth(p: Policy): number {
    if (p.domain_scope === null && p.context_scope === null && !p.data_contract_scope) return 0;
    if (p.context_scope === null && !p.data_contract_scope) return 1;
    if (!p.data_contract_scope) return 2;
    return 3;
  }

  const sortedPolicies = useMemo(() => {
    const rows = [...filteredPolicies];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") {
        cmp = a.id - b.id;
      } else if (sortKey === "target") {
        const av = (a.user_id ?? a.group_name ?? groupMap.get(a.group_id ?? -1) ?? "").toLowerCase();
        const bv = (b.user_id ?? b.group_name ?? groupMap.get(b.group_id ?? -1) ?? "").toLowerCase();
        cmp = av.localeCompare(bv);
      } else if (sortKey === "permission_name") {
        cmp = (PERMISSION_RANK[a.permission_name] ?? 0) - (PERMISSION_RANK[b.permission_name] ?? 0);
      } else {
        cmp = scopeDepth(a) - scopeDepth(b) || formatScope(a.domain_scope, a.context_scope, a.data_contract_scope).localeCompare(formatScope(b.domain_scope, b.context_scope, b.data_contract_scope));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filteredPolicies, sortKey, sortDir, groupMap]);

  function isProtected(p: Policy): boolean {
    if (!currentUserId || !minAdminUserId) return false;
    return p.user_id === minAdminUserId && currentUserId !== minAdminUserId;
  }
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("filterPolicies")}
        />
        <span className="whitespace-nowrap text-sm text-gray-400">
          {tWith("xOfYPolicies", { count: String(filteredPolicies.length), total: String(policies.length) })}
        </span>
      </div>

      {policies.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-12 text-center text-sm text-gray-400 shadow-lg">
            {t("noPoliciesYet")}
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-12 text-center text-sm text-gray-400 shadow-lg">
            {t("noPoliciesMatch")}
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-gray-300 shadow-lg">
          <table className="w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                {(["id", "target", "permission_name", "scope"] as const).map((key) => {
                  const labels: Record<string, string> = { id: t("id"), target: t("target"), permission_name: t("permissionLabel"), scope: t("scope") };
                  return (
                    <th key={key} className="px-6 py-3 text-left font-medium text-gray-500">
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className="inline-flex items-center gap-1.5"
                        title={tWith("sortBy", { column: labels[key] })}
                      >
                        {labels[key]}
                        {sortArrows(sortKey === key, sortDir)}
                      </button>
                    </th>
                  );
                })}
                <th className="px-6 py-3 text-right font-medium text-gray-500">{t("tblActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPolicies.map((p) => {
                const groupName = p.group_name ?? groupMap.get(p.group_id ?? -1) ?? "";
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">{p.id}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {p.user_id ? (
                        <span>
                          <span className="text-xs text-gray-400">{t("userLabel")}</span>{" "}
                          <span className="font-medium text-gray-900">{p.user_id}</span>
                        </span>
                      ) : (
                        <span>
                          <span className="text-xs text-gray-400">{t("groupLabel")}</span>{" "}
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
                            onClick={() => onViewUser(p.user_id ?? "")}
                            className="editor-soft-button"
                          >
                            <EyeIcon />
                            <span className="ml-1.5">{t("view")}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onViewGroupMembers(p.group_id!, groupName)}
                            className="editor-soft-button"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                            </svg>
                            <span className="ml-1.5">{t("members")}</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(p)}
                          className="editor-soft-button"
                          disabled={isProtected(p)}
                          title={isProtected(p) ? t("cannotModifyPrimaryAdmin") : undefined}
                          style={{ opacity: isProtected(p) ? 0.4 : 1, cursor: isProtected(p) ? "not-allowed" : "pointer" }}
                        >
                          <PencilIcon />
                          <span className="ml-1.5">{t("edit")}</span>
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          className="rounded-md px-3 py-1.5 text-sm font-bold text-white"
                          style={{ backgroundColor: isProtected(p) ? "#9ca3af" : "#dc2626", cursor: isProtected(p) ? "not-allowed" : "pointer" }}
                          disabled={isProtected(p)}
                          title={isProtected(p) ? t("cannotModifyPrimaryAdmin") : undefined}
                        >
                          {t("deleteGroup")}
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
