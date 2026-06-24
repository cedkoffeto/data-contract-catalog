"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function StatusIcon({ status }: { status: string }) {
  if (status === "pending") {
    return <svg viewBox="0 0 16 16" fill="currentColor" className="mr-1 inline-block" width="12" height="12" aria-hidden="true"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.25 4v4.5L11 10.3l.5-.87L8.25 8V4h-1z"/></svg>;
  }
  if (status === "approved") {
    return <svg viewBox="0 0 16 16" fill="currentColor" className="mr-1 inline-block" width="12" height="12" aria-hidden="true"><path d="M13.28 3.97l-7.72 7.72-3.28-3.28.7-.7 2.58 2.58 7.02-7.02.7.7z"/></svg>;
  }
  if (status === "rejected") {
    return <svg viewBox="0 0 16 16" fill="currentColor" className="mr-1 inline-block" width="12" height="12" aria-hidden="true"><path d="M12.59 3.41L8.5 7.5l4.09 4.09-.7.7L7.8 8.2l-4.09 4.09-.7-.7L7.1 7.5 3.01 3.41l.7-.7L7.8 6.8l4.09-4.09.7.7z"/></svg>;
  }
  if (status === "conflicted") {
    return <svg viewBox="0 0 16 16" fill="currentColor" className="mr-1 inline-block" width="12" height="12" aria-hidden="true"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.5 5v3.5H11v-1H8.5V5h-1z"/></svg>;
  }
  return null;
}

function ActionIcon({ action }: { action: string }) {
  if (action.includes("create") || action.includes("add")) {
    return <svg viewBox="0 0 16 16" fill="currentColor" className="mr-1 inline-block" width="12" height="12" aria-hidden="true"><path d="M7.5 2v5.5H2v1h5.5V13h1V8.5H14v-1H8.5V2h-1z"/></svg>;
  }
  if (action.includes("delete") || action.includes("remove")) {
    return <svg viewBox="0 0 16 16" fill="currentColor" className="mr-1 inline-block" width="12" height="12" aria-hidden="true"><path d="M2 7.5h12v1H2v-1z"/></svg>;
  }
  return null;
}

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
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      <ActionIcon action={action} />
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
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<"access" | "changes" | "audit">(() => {
    if (searchParams?.get("tab") === "changes") return "changes";
    if (searchParams?.get("tab") === "audit") return "audit";
    return "access";
  });
  const highlightId = searchParams?.get("highlight") ? Number(searchParams.get("highlight")) : null;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) setData(await res.json());
    } catch { /* server may be unavailable */ }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cards = [
    { label: "Contracts", value: data?.contractsCount, color: "#3b82f6", href: "/", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
    { label: "Policies", value: data?.policyCount, color: "#ef4444", href: "/admin/policies", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    { label: "Groups", value: data?.groupCount, color: "#f59e0b", href: "/admin/groups", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { label: "Users", value: data?.userCount, color: "#22c55e", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { label: "Notifications", value: data?.notificationsCount, color: "#a855f7", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
    { label: "Unread", value: data?.unreadNotificationsCount, color: "#ec4899", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Subscriptions", value: data?.subscriptionsCount, color: "#6366f1", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6m-4 5H8m0 4h8m-8-8h2" },
    { label: "Memberships", value: data?.memberCount, color: "#64748b", href: "/admin/groups", icon: "M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Key Metrics</h2>
        <div className="kpi-grid">
          {cards.map((c) => {
            const inner = (
              <div className="kpi-card" style={{ borderLeft: "4px solid #f97316", backgroundColor: "rgba(249,115,22,0.08)" }}>
                <div className="kpi-card__info">
                  <p>{c.label}</p>
                  <p className="kpi-card__value">{c.value ?? "\u2014"}</p>
                </div>
                <svg className="kpi-card__icon" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
            );
            return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>;
          })}
        </div>
      </div>

      <div className="flex">
        {(["access", "changes", "audit"] as const).map((tab, i) => {
          const isActive = activeTab === tab;
          const isFirst = i === 0;
          const isLast = i === 2;
          const clipPath = isFirst
            ? "polygon(0 0, 92% 0, 100% 100%, 0 100%)"
            : isLast
              ? "polygon(8% 0, 100% 0, 100% 100%, 0 100%)"
              : "polygon(8% 0, 100% 0, 92% 100%, 0 100%)";
          const labels = { access: "Access Requests", changes: "Change Requests", audit: "Audit Logs" };
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              className={`group relative flex min-w-max items-center gap-2 px-6 text-sm font-bold transition hover:-translate-y-px focus:outline-none ${isFirst ? "ml-0" : "-ml-px"} ${isActive ? "z-20" : "z-10"}`}
              style={{
                clipPath,
                backgroundColor: isActive ? "#f97316" : "#f8fafc",
                color: isActive ? "#ffffff" : "#64748b",
                boxShadow: isActive ? "0 8px 18px rgba(249, 115, 22, 0.22)" : "0 1px 2px rgba(15, 23, 42, 0.06)",
                paddingTop: "10.1px",
                paddingBottom: "10.1px",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1">
        <div className={`col-start-1 row-start-1 ${activeTab !== "access" ? "invisible" : ""}`} aria-hidden={activeTab !== "access"}><AccessRequestsSection /></div>
        <div className={`col-start-1 row-start-1 ${activeTab !== "changes" ? "invisible" : ""}`} aria-hidden={activeTab !== "changes"}><ChangeRequestsSection highlightId={highlightId} /></div>
        <div className={`col-start-1 row-start-1 ${activeTab !== "audit" ? "invisible" : ""}`} aria-hidden={activeTab !== "audit"}><AuditLogSection logs={data?.recentLogs ?? []} /></div>
      </div>
    </div>
  );
}

function ChangeRequestsSection({ highlightId: initialHighlightId }: { highlightId: number | null }) {
  const [highlightedId, setHighlightedId] = useState(initialHighlightId);

  useEffect(() => {
    if (highlightedId === null) return;
    const timer = setTimeout(() => setHighlightedId(null), 6000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  const [requests, setRequests] = useState<Array<{
    id: number;
    contractSlug: string;
    editorId: string;
    yamlContent: string;
    status: string;
    source: string;
    gitlabMrUrl: string;
    rejectionReason: string;
    createdAt: string;
    resolvedAt: string | null;
    resolvedBy: string | null;
  }>>([]);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (mergeError === null) return;
    const timer = setTimeout(() => setMergeError(null), 15000);
    return () => clearTimeout(timer);
  }, [mergeError]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/change-requests");
      if (res.ok) setRequests((await res.json()).items ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (rejectingId === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRejectingId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rejectingId]);

  async function handleSyncWithGit() {
    setSyncing(true);
    try {
      await fetch("/api/change-requests/sync", { method: "POST" });
      await fetchRequests();
    } catch { /* silent */ } finally {
      setSyncing(false);
    }
  }

  async function handleMerge(id: number) {
    setMergeError(null);
    setActionLoading((prev) => ({ ...prev, [id]: "merge" }));
    try {
      const res = await fetch(`/api/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge" }),
      });
      if (!res.ok) {
        const err = (await res.json()).error ?? "Failed to merge";
        throw new Error(err);
      }
      await fetchRequests();
    } catch (e) {
      setMergeError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  }

  async function handleReject(id: number) {
    const reason = rejectReason.trim();
    if (!reason || reason.length < 3) return;
    setMergeError(null);
    setActionLoading((prev) => ({ ...prev, [id]: "reject" }));
    try {
      const res = await fetch(`/api/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to reject");
      setRejectingId(null);
      setRejectReason("");
      await fetchRequests();
    } catch { /* silent */ } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  }

  return (
    <>
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            Change Requests
            {requests.filter((r) => r.status === "pending").length > 0 && (
              <span className="text-sm font-normal text-gray-400">
                {" "}({requests.filter((r) => r.status === "pending").length} pending)
              </span>
            )}
          </h2>
          <button
            onClick={() => void handleSyncWithGit()}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold disabled:opacity-50 hover:brightness-95"
            style={{ backgroundColor: "rgba(249,115,22,0.08)", color: "var(--ui-text-soft)" }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" aria-hidden="true" style={{ color: "#f97316" }}><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.25 4v4.5l3.75 1.75.5-.87L8.25 8V4h-1z"/></svg>
            {syncing ? "Syncing\u2026" : "Sync MRs with Git"}
          </button>
        </div>
        {mergeError ? (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="flex-1">{mergeError}</span>
            <button onClick={() => setMergeError(null)} className="text-red-400 hover:text-red-600" type="button">&times;</button>
          </div>
        ) : null}
        {requests.length === 0 ? (
          <div className="rounded-lg border bg-white py-8 text-center text-sm text-gray-400">No change requests yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border shadow-lg">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["ID", "Contract", "Editor", "Status", "Source", "MR URL", "Rejection", "Created", "Actions"].map((label) => (
                    <th key={label} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((r) => (
                  <tr key={r.id} className={r.id === highlightedId ? "bg-orange-50 ring-2 ring-orange-400" : ""}>
                    <td className="px-4 py-3 text-xs text-gray-500">#{r.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-900">{r.contractSlug}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.editorId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        r.status === "pending" ? "bg-yellow-50 text-yellow-700" :
                        r.status === "approved" ? "bg-green-50 text-green-700" :
                        r.status === "conflicted" ? "bg-orange-50 text-orange-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        <StatusIcon status={r.status} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {r.source === "app" ? "App" : "GitLab"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.gitlabMrUrl ? (
                        <a href={r.gitlabMrUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
                          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M3 2v12h10V7h-1v6H4V3h5V2H3zm7 0v1h2.3L7.15 8.15l.7.7L13 3.7V6h1V2h-4z"/></svg>
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="max-w-[150px] truncate px-4 py-3 text-xs text-gray-500">
                      {r.rejectionReason || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => void handleMerge(r.id)}
                            disabled={actionLoading[r.id] === "merge"}
                            className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M7.5 2v5.5H2v1h5.5V13h1V8.5H14v-1H8.5V2h-1z"/></svg>
                            {actionLoading[r.id] === "merge" ? "Merging\u2026" : "Merge"}
                          </button>
                          <button
                            onClick={() => { setRejectingId(r.id); setRejectReason(""); }}
                            disabled={actionLoading[r.id] === "reject"}
                            className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M2 7.5h12v1H2v-1z"/></svg>
                            {actionLoading[r.id] === "reject" ? "Rejecting\u2026" : "Reject"}
                          </button>
                        </div>
                      ) : r.status === "conflicted" && r.gitlabMrUrl ? (
                        <a href={r.gitlabMrUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
                          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M3 2v12h10V7h-1v6H4V3h5V2H3zm7 0v1h2.3L7.15 8.15l.7.7L13 3.7V6h1V2h-4z"/></svg>
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {r.resolvedBy ? `by ${r.resolvedBy}` : "\u2014"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectingId !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setRejectingId(null)}
        >
          <div
            className="flex max-h-[60vh] flex-col rounded-lg bg-white shadow-xl"
            style={{ width: "min(50vw, 600px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Reject Change Request</h3>
                <p className="text-[11px] text-gray-400">Provide a reason for rejecting request #{rejectingId}.</p>
              </div>
              <button
                onClick={() => setRejectingId(null)}
                className="editor-close-button"
                aria-label="Close"
                title="Close"
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="px-4 pb-4 pt-3">
              <textarea
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (min. 3 characters)"
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm text-gray-900 outline-none"
                style={{ borderColor: "#d1d5db" }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2">
              <button
                onClick={() => setRejectingId(null)}
                className="rounded px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReject(rejectingId)}
                disabled={rejectReason.trim().length < 3 || actionLoading[rejectingId] === "reject"}
                className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                {actionLoading[rejectingId] === "reject" ? "Rejecting\u2026" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AuditLogSection({ logs: initialLogs }: { logs: AuditLog[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

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

  return (
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
      {sorted.length === 0 ? (
        <div className="rounded-lg border bg-white py-8 text-center text-sm text-gray-400">No audit entries yet.</div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

function AccessRequestsSection() {
  const [requests, setRequests] = useState<Array<{ id: number; user_id: string; domain: string; context: string; data_contract: string; requested_permission: "reader" | "editor"; message: string; status: string; created_at: string }>>([]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/access-requests");
      if (res.ok) setRequests((await res.json()).items ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("API error");
    } catch {
      // PATCH may return before background work completes; refresh anyway
    }
    await fetchRequests();
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Access Requests {pending.length > 0 && <span className="text-sm font-normal text-gray-400">({pending.length} pending)</span>}
      </h2>
      {requests.length === 0 ? (
        <div className="rounded-lg border bg-white py-8 text-center text-sm text-gray-400">No access requests yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-lg">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["User", "Domain", "Context", "Contract", "Permission", "Message", "Status", "Actions"].map((label) => (
                  <th key={label} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-xs text-gray-900">{r.user_id}</td>
                  <td className="px-3 py-2 text-gray-600">{r.domain || "\u2014"}</td>
                  <td className="px-3 py-2 text-gray-600">{r.context || "\u2014"}</td>
                  <td className="px-3 py-2 text-gray-600">{r.data_contract || "\u2014"}</td>
                  <td className="px-3 py-2 text-gray-600">{r.requested_permission || "reader"}</td>
                  <td className="max-w-[150px] truncate px-3 py-2 text-xs text-gray-500">{r.message || "\u2014"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${r.status === "pending" ? "bg-yellow-50 text-yellow-700" : r.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      <StatusIcon status={r.status} />
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "pending" ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleStatus(r.id, "approved")} className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-100">Approve</button>
                        <button onClick={() => handleStatus(r.id, "rejected")} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-100">Deny</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{"\u2014"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
