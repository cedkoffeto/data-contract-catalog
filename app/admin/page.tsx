"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/src/lib/use-i18n";

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
      {action}
    </span>
  );
}

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
};

export default function AdminDashboard() {
  const { t, tWith } = useT();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<"access" | "changes" | "audit">(() => {
    if (searchParams?.get("tab") === "changes") return "changes";
    if (searchParams?.get("tab") === "audit") return "audit";
    return "access";
  });
  const highlightId = searchParams?.get("highlight") ? Number(searchParams.get("highlight")) : null;
  const [pendingAccess, setPendingAccess] = useState(0);
  const [pendingChanges, setPendingChanges] = useState(0);

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
    <div className="space-y-6 px-6 lg:px-8">
      <div className="rounded-lg border bg-white p-6">
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
          const labels = { access: t("accessRequests"), changes: t("changeRequests"), audit: t("auditLog") };
          const pendingCounts = { access: pendingAccess, changes: pendingChanges, audit: 0 };
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
              {pendingCounts[tab] > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold" style={{ color: isActive ? "#fff" : "#f97316", backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "rgba(249,115,22,0.12)" }}>
                  {pendingCounts[tab]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <div className={activeTab !== "access" ? "hidden" : ""} aria-hidden={activeTab !== "access"}><AccessRequestsSection onPendingCount={setPendingAccess} /></div>
        <div className={activeTab !== "changes" ? "hidden" : ""} aria-hidden={activeTab !== "changes"}><ChangeRequestsSection highlightId={highlightId} onPendingCount={setPendingChanges} /></div>
        <div className={activeTab !== "audit" ? "hidden" : ""} aria-hidden={activeTab !== "audit"}><AuditLogSection /></div>
      </div>
    </div>
  );
}

function ChangeRequestsSection({ highlightId: initialHighlightId, onPendingCount }: { highlightId: number | null; onPendingCount: (n: number) => void }) {
  const { t, tWith } = useT();
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
    updatedAt: string;
    resolvedAt: string | null;
    resolvedBy: string | null;
  }>>([]);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

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
    onPendingCount(requests.filter((r) => r.status === "pending").length);
  }, [requests, onPendingCount]);

  useEffect(() => {
    if (rejectingId === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRejectingId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rejectingId]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = requests
    .filter((r) =>
      [r.contractSlug, r.editorId, r.status, r.source].some((v) =>
        v.toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      const aVal = a[sortKey as keyof typeof a];
      const bVal = b[sortKey as keyof typeof b];
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal ?? "").localeCompare(String(bVal ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

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
      <div className="w-full">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            {t("changeRequests")}
            {requests.filter((r) => r.status === "pending").length > 0 && (
              <span className="text-sm font-normal text-gray-400">
                {" "}{tWith("pendingCount", { count: String(requests.filter((r) => r.status === "pending").length) })}
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
            {syncing ? "Syncing" : "Sync MRs with Git"}
          </button>
        </div>
        <div className="mb-3 flex items-center gap-3">
          <input
            className="flex-1 rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Filter by contract, editor, status"
          />
          <span className="whitespace-nowrap text-xs text-gray-400">
            {filtered.length} / {requests.length}
          </span>
        </div>
        {mergeError ? (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="flex-1">{mergeError}</span>
            <button onClick={() => setMergeError(null)} className="text-red-400 hover:text-red-600" type="button">&times;</button>
          </div>
        ) : null}
        <div className="w-full overflow-x-auto rounded-lg border shadow-lg">
          <table className="min-w-full table-fixed divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[{ label: t("tblId"), key: "id", w: "w-[5%]" }, { label: t("tblContract"), key: "contractSlug", w: "w-[11%]" }, { label: t("tblEditor"), key: "editorId", w: "w-[11%]" }, { label: t("tblStatus"), key: "status", w: "w-[8%]" }, { label: "Source", key: "source", w: "w-[7%]" }, { label: t("tblMrUrl"), key: "gitlabMrUrl", w: "w-[8%]" }, { label: t("tblRejection"), key: "rejectionReason", w: "w-[12%]" }, { label: t("tblCreated"), key: "createdAt", w: "w-[11%]" }, { label: "Updated", key: "updatedAt", w: "w-[11%]" }, { label: t("tblActions"), key: null, w: "w-[16%]" }].map(({ label, key, w }) => (
                    <th key={label} className={`${w} px-3 py-2 text-left font-semibold text-gray-500 ${key ? "cursor-pointer select-none hover:bg-gray-100" : ""}`} onClick={() => key && toggleSort(key)}>
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {key && sortKey === key && (
                          <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" className={sortDir === "asc" ? "" : "rotate-180"}><path d="M8 2l5 6H3l5-6z"/></svg>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-sm text-gray-400">{requests.length === 0 ? t("noChangeRequests") : "No change requests match your filter."}</td></tr>
                ) : paginated.map((r) => (
                  <tr key={r.id} className={r.id === highlightedId ? "bg-orange-50 ring-2 ring-orange-400" : ""}>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">#{r.id}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.contractSlug}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.editorId}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                        r.status === "pending" ? "bg-yellow-50 text-yellow-700" :
                        r.status === "approved" ? "bg-green-50 text-green-700" :
                        r.status === "conflicted" ? "bg-orange-50 text-orange-700" :
                        "bg-red-50 text-red-700"
                      }`}>
                        <StatusIcon status={r.status} />
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                        {r.source === "app" ? "App" : "GitLab"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.gitlabMrUrl ? (
                        <a href={r.gitlabMrUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M3 2v12h10V7h-1v6H4V3h5V2H3zm7 0v1h2.3L7.15 8.15l.7.7L13 3.7V6h1V2h-4z"/></svg>
                          {t("viewMr")}
                        </a>
                      ) : (
                        <span className="text-gray-400">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {r.rejectionReason || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.status === "pending" ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => void handleMerge(r.id)}
                            disabled={actionLoading[r.id] === "merge"}
                            className="rounded-md px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-200 disabled:opacity-50"
                            style={{ backgroundColor: "#dcfce7" }}
                          >
                            {actionLoading[r.id] === "merge" ? t("merging") : t("approve")}
                          </button>
                          <button
                            onClick={() => { setRejectingId(r.id); setRejectReason(""); }}
                            disabled={actionLoading[r.id] === "reject"}
                            className="rounded-md px-2 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            style={{ backgroundColor: "#ef4444" }}
                          >
                            {actionLoading[r.id] === "reject" ? t("rejecting") : t("reject")}
                          </button>
                        </div>
                      ) : r.status === "conflicted" && r.gitlabMrUrl ? (
                        <button
                          onClick={() => window.open(r.gitlabMrUrl, "_blank", "noopener,noreferrer")}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-200"
                          style={{ backgroundColor: "#dbeafe" }}
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" aria-hidden="true"><path d="M3 2v12h10V7h-1v6H4V3h5V2H3zm7 0v1h2.3L7.15 8.15l.7.7L13 3.7V6h1V2h-4z"/></svg>
                          {t("viewMr")}
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          {r.resolvedBy ? tWith("byUser", { user: r.resolvedBy }) : "\u2014"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (<div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{t("show")}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="rounded-md border bg-white px-2 py-1 text-xs text-gray-700"
              >
                {[10, 100, 1000].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-gray-400">{t("entries")}</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  {t("previous")}
                </button>
                <span className="text-gray-400">
                  {tWith("pageOf", { page: String(safePage + 1), total: String(totalPages) })}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  {t("next")}
                </button>
              </div>
            )}
            </div>)}
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
                aria-label={t("close")}
                title={t("close")}
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
                placeholder={t("rejectionReasonPlaceholder")}
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
                {t("cancel")}
              </button>
              <button
                onClick={() => void handleReject(rejectingId)}
                disabled={rejectReason.trim().length < 3 || actionLoading[rejectingId] === "reject"}
                className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                {actionLoading[rejectingId] === "reject" ? t("rejecting") : t("reject")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AuditLogSection() {
  const { t, tWith } = useT();
  const [items, setItems] = useState<Array<{
    id: number;
    action: string;
    actor_id: string;
    target_type: string;
    target_id: string;
    details: string;
    created_at: string;
  }>>([]);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  const toggleExpand = (id: number) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sortKey, sortDir, search });
      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortKey, sortDir, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const shortDetails = (action: string, raw: string) => {
    if (!raw || raw === "{}") return null;
    let d: Record<string, unknown>;
    try { d = JSON.parse(raw); } catch { return raw; }

    switch (action) {
      case "subscription.subscribe":
        return `Channel: ${d.channel ?? "?"}`;
      case "subscription.unsubscribe":
        return null;
      case "contract.create":
        return null;
      case "contract.update":
        return `${d.filePath ?? "?"} (mode: ${d.mode ?? "?"})`;
      case "policy.create":
        return [d.userId ? `User: ${d.userId}` : "", d.groupId ? `Group: ${d.groupId}` : "", d.permissionId ? `Permission: ${d.permissionId}` : ""].filter(Boolean).join(", ");
      case "policy.update":
        return `Permission: ${d.permissionId ?? "?"}`;
      case "policy.delete":
        return d.replacedBy ? `Replaced by ${d.replacedBy}` : null;
      case "group.create":
        return null;
      case "group.delete":
        return null;
      case "group.add_member":
        return `User added: ${d.userId ?? "?"}`;
      case "group.remove_member":
        return `User removed: ${d.userId ?? "?"}`;
      case "auth.login":
        return null;
      case "auth.logout":
        return null;
      case "auth.login_failed":
        return `Error: ${d.error ?? "?"}`;
      case "auth.unauthorized":
        return `Reason: ${d.reason ?? "?"}`;
      case "access_request.create":
        return [d.domain ? `Domain: ${d.domain}` : "", d.context ? `Context: ${d.context}` : "", d.requestedPermission ? `Permission: ${d.requestedPermission}` : ""].filter(Boolean).join(", ");
      case "access_request.approve":
        return `Approved as ${(d as any).requestedPermission ?? "?"}`;
      case "access_request.deny":
        return `Denied (was ${(d as any).requestedPermission ?? "?"})`;
      default:
        return JSON.stringify(d, null, 2);
    }
  };

  const fullDetails = (action: string, raw: string) => {
    const s = shortDetails(action, raw);
    if (!raw || raw === "{}") return s;
    try {
      const pretty = JSON.stringify(JSON.parse(raw), null, 2);
      return s ? s + "\n\n" + pretty : pretty;
    } catch {
      return s ?? raw;
    }
  };

  return (
    <div className="w-full">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{t("auditLog")}</h2>
      <div className="mb-3 flex items-center gap-3">
        <input
          className="flex-1 rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder={t("filterAudit")}
        />
        <span className="whitespace-nowrap text-xs text-gray-400">
          {loading ? "\u2026" : tWith("entriesCount", { count: String(total) })}
        </span>
      </div>
      <div className="w-full overflow-x-auto rounded-lg border shadow-lg">
          <table className="min-w-full table-fixed divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[{ key: "created_at", label: t("tblDate"), w: "w-[15%]" }, { key: "action", label: t("tblAction"), w: "w-[13%]" }, { key: "target_id", label: "Actor", w: "w-[37%]" }, { key: "details", label: t("tblDetails"), w: "w-[35%]" }].map(({ key, label, w }) => (
                  <th
                    key={key}
                    onClick={() => { toggleSort(key); }}
                    className={`${w} cursor-pointer select-none px-3 py-2 text-left font-semibold text-gray-500 hover:text-gray-700`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {sortKey === key && (
                        <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" className={sortDir === "asc" ? "" : "rotate-180"}><path d="M8 2l5 6H3l5-6z"/></svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-400">{t("loading")}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-400">{t("noAudit")}</td></tr>
              ) : items.map((log) => (
                <Fragment key={log.id}>
                  <tr>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {log.actor_id} <span className="text-gray-400">→</span> {log.target_type}:{log.target_id}
                    </td>
                    <td className="truncate px-3 py-2 text-gray-600 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => toggleExpand(log.id)}>
                      {shortDetails(log.action, log.details) ?? "\u2014"}
                    </td>
                  </tr>
                  {expandedIds[log.id] && (
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-3 font-mono text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                        {fullDetails(log.action, log.details) ?? "\u2014"}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (<div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{t("show")}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="rounded-md border bg-white px-2 py-1 text-xs text-gray-700"
            >
              {[10, 100, 1000].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-gray-400">{t("entries")}</span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                {t("previous")}
              </button>
              <span className="text-gray-400">
                {tWith("pageOf", { page: String(safePage + 1), total: String(totalPages) })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                {t("next")}
              </button>
            </div>
          )}
        </div>)}
    </div>
  );
}

function AccessRequestsSection({ onPendingCount }: { onPendingCount: (n: number) => void }) {
  const { t, tWith } = useT();
  const [requests, setRequests] = useState<Array<{ id: number; user_id: string; domain: string; context: string; data_contract: string; requested_permission: "reader" | "editor"; message: string; status: string; created_at: string; updated_at: string }>>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/access-requests");
      if (res.ok) setRequests((await res.json()).items ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    onPendingCount(requests.filter((r) => r.status === "pending").length);
  }, [requests, onPendingCount]);

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

  const filtered = requests
    .filter((r) =>
      [r.user_id, r.domain, r.context, r.data_contract, r.requested_permission, r.status].some((v) =>
        v.toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      const aVal = a[sortKey as keyof typeof a];
      const bVal = b[sortKey as keyof typeof b];
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal ?? "").localeCompare(String(bVal ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return (
    <div className="w-full">
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        {t("accessRequests")} {pending.length > 0 && <span className="text-sm font-normal text-gray-400">{tWith("pendingCount", { count: String(pending.length) })}</span>}
      </h2>
      <div className="mb-3 flex items-center gap-3">
        <input
          className="flex-1 rounded-md border bg-white px-2 py-1.5 text-xs text-gray-900"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Filter by user, domain, contract, status"
        />
        <span className="whitespace-nowrap text-xs text-gray-400">
          {filtered.length} / {requests.length}
        </span>
      </div>
      <div className="w-full overflow-x-auto rounded-lg border shadow-lg">
          <table className="min-w-full table-fixed divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[{ label: t("tblId"), key: "id", w: "w-[5%]" }, { label: "User", key: "user_id", w: "w-[11%]" }, { label: "Domain", key: "domain", w: "w-[8%]" }, { label: "Context", key: "context", w: "w-[11%]" }, { label: "Contract", key: "data_contract", w: "w-[11%]" }, { label: "Permission", key: "requested_permission", w: "w-[8%]" }, { label: "Message", key: null, w: "w-[15%]" }, { label: "Created", key: "created_at", w: "w-[9%]" }, { label: "Updated", key: "updated_at", w: "w-[9%]" }, { label: t("tblStatus"), key: "status", w: "w-[7%]" }, { label: t("tblActions"), key: null, w: "w-[6%]" }].map(({ label, key, w }) => (
                  <th key={label} className={`${w} px-3 py-2 text-left font-semibold text-gray-500 ${key ? "cursor-pointer select-none hover:bg-gray-100" : ""}`} onClick={() => key && toggleSort(key)}>
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {key && sortKey === key && (
                        <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" className={sortDir === "asc" ? "" : "rotate-180"}><path d="M8 2l5 6H3l5-6z"/></svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm text-gray-400">{requests.length === 0 ? t("noAccessRequests") : "No access requests match your filter."}</td>
                </tr>
              ) : paginated.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">#{r.id}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.user_id}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.domain || "\u2014"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.context || "\u2014"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.data_contract || "\u2014"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.requested_permission || "reader"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{r.message || "\u2014"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : "\u2014"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${r.status === "pending" ? "bg-yellow-50 text-yellow-700" : r.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      <StatusIcon status={r.status} />
                      {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {r.status === "pending" ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleStatus(r.id, "approved")} className="rounded-md px-2 py-1 text-xs font-bold text-green-700 hover:bg-green-200" style={{ backgroundColor: "#dcfce7" }}>{t("approve")}</button>
                        <button onClick={() => handleStatus(r.id, "rejected")} className="rounded-md px-2 py-1 text-xs font-bold text-white hover:bg-red-700" style={{ backgroundColor: "#ef4444" }}>{t("deny")}</button>
                      </div>
                    ) : (
                      <span className="text-gray-400">{"\u2014"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (<div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
              <span className="text-gray-400">{t("show")}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="rounded-md border bg-white px-2 py-1 text-xs text-gray-700"
              >
                {[10, 100, 1000].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-gray-400">{t("entries")}</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  {t("previous")}
                </button>
                <span className="text-gray-400">
                  {tWith("pageOf", { page: String(safePage + 1), total: String(totalPages) })}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                >
                  {t("next")}
                </button>
              </div>
            )}
          </div>)}
      </div>
  );
}
