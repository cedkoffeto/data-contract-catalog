"use client";

import { useCallback, useEffect, useState } from "react";

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    "policy.create": "bg-indigo-50 text-indigo-700",
    "policy.delete": "bg-pink-50 text-pink-800",
    "group.create": "bg-teal-50 text-teal-700",
    "group.delete": "bg-orange-50 text-orange-800",
    "group.add_member": "bg-cyan-50 text-cyan-700",
    "group.remove_member": "bg-rose-50 text-rose-800",
  };
  const cls = colors[action] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {action}
    </span>
  );
}

type AuditLog = {
  id: number;
  action: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
};

type DashboardData = {
  contractsCount: number;
  groupCount: number;
  memberCount: number;
  userCount: number;
  policyCount: number;
  notificationsCount: number;
  unreadNotificationsCount: number;
  subscriptionsCount: number;
  auditCount: number;
  recentLogs: AuditLog[];
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/admin/dashboard");
    setData(await res.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const logs = data?.recentLogs ?? [];

  const filtered = logs.filter((log) =>
    [log.created_at, log.action, log.actor_id, log.target_type, log.target_id, log.details].some((v) =>
      String(v ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey as keyof AuditLog] ?? "";
    const bVal = b[sortKey as keyof AuditLog] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const cards = data ? [
    { label: "Contracts", value: data.contractsCount, accent: "border-l-blue-500", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
    { label: "Policies", value: data.policyCount, accent: "border-l-red-500", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { label: "Groups", value: data.groupCount, accent: "border-l-amber-500", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { label: "Users", value: data.userCount, accent: "border-l-green-500", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { label: "Notifications", value: data.notificationsCount, accent: "border-l-purple-500", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
    { label: "Unread", value: data.unreadNotificationsCount, accent: "border-l-pink-500", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Subscriptions", value: data.subscriptionsCount, accent: "border-l-indigo-500", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6m-4 5H8m0 4h8m-8-8h2" },
    { label: "Memberships", value: data.memberCount, accent: "border-l-gray-500", icon: "M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-lg border bg-white border-l-4 ${c.accent} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{c.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{c.value}</p>
              </div>
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-3">
          <input
            className="flex-1 rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Filter by action, actor or target…"
          />
          <span className="whitespace-nowrap text-sm text-gray-400">
            {sorted.length} entries
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border shadow-lg">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                {(["created_at", "action", "actor_id", "target_id", "details"] as const).map((key) => {
                  const labels: Record<string, string> = { created_at: "Date", action: "Action", actor_id: "Actor", target_id: "Target", details: "Details" };
                  return (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className="cursor-pointer select-none px-6 py-3 text-left font-medium text-gray-500 hover:text-gray-700"
                    >
                      {labels[key]}
                      {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">{log.actor_id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    <span className="text-gray-400">{log.target_type}:</span> {log.target_id}
                  </td>
                  <td className="max-w-[200px] truncate px-6 py-4 font-mono text-xs text-gray-500">
                    {log.details && log.details !== "{}" ? log.details : "—"}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No audit entries yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded-md border bg-white px-2 py-1 text-sm text-gray-700"
            >
              {[10, 100, 1000].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400">entries</span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {safePage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
