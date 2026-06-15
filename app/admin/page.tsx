"use client";

import { useCallback, useEffect, useState } from "react";

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    "role.create": "bg-blue-50 text-blue-800",
    "role.update": "bg-yellow-50 text-yellow-800",
    "role.delete": "bg-red-50 text-red-800",
    "user.assign": "bg-green-50 text-green-700",
    "user.revoke": "bg-purple-50 text-purple-800",
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
  created_at: string;
};

export default function AdminDashboard() {
  const [roleCount, setRoleCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [assignCount, setAssignCount] = useState(0);
  const [logs, setLogs] = useState<AuditLog[]>([]);
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
    const data = await res.json();
    setRoleCount(data.roleCount ?? 0);
    setUserCount(data.userCount ?? 0);
    setAssignCount(data.assignCount ?? 0);
    setLogs(data.recentLogs ?? []);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = logs.filter((log) =>
    [log.created_at, log.action, log.actor_id, log.target_type, log.target_id].some((v) =>
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

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Roles</p>
          <p className="text-2xl font-bold text-gray-900">{roleCount}</p>
        </div>
        <div className="flex-1 rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Users with roles</p>
          <p className="text-2xl font-bold text-gray-900">{userCount}</p>
        </div>
        <div className="flex-1 rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Total assignments</p>
          <p className="text-2xl font-bold text-gray-900">{assignCount}</p>
        </div>
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
                {(["created_at", "action", "actor_id", "target_id"] as const).map((key) => {
                  const labels: Record<string, string> = { created_at: "Date", action: "Action", actor_id: "Actor", target_id: "Target" };
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
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
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
