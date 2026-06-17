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
    { label: "Contracts", value: data.contractsCount, color: "bg-blue-50 text-blue-700" },
    { label: "Policies", value: data.policyCount, color: "bg-red-50 text-red-700" },
    { label: "Groups", value: data.groupCount, color: "bg-amber-50 text-amber-700" },
    { label: "Users", value: data.userCount, color: "bg-green-50 text-green-700" },
    { label: "Notifications", value: data.notificationsCount, color: "bg-purple-50 text-purple-700" },
    { label: "Unread", value: data.unreadNotificationsCount, color: "bg-pink-50 text-pink-700" },
    { label: "Subscriptions", value: data.subscriptionsCount, color: "bg-indigo-50 text-indigo-700" },
    { label: "Memberships", value: data.memberCount, color: "bg-gray-50 text-gray-700" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{c.label}</p>
            <p className={`mt-1 inline-block rounded-md px-2 py-0.5 text-2xl font-bold ${c.color}`}>
              {c.value}
            </p>
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
