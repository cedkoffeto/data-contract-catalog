"use client";

import { useCallback, useEffect, useState } from "react";

import { t } from "@/src/lib/i18n";
import type { ContractIssue } from "@/src/lib/types";

const STATUSES = ["open", "fixed", "false_alert"] as const;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: ContractIssue["status"]) {
  if (status === "fixed") return t("issueStatusFixed");
  if (status === "false_alert") return t("issueStatusFalseAlert");
  return t("issueStatusOpen");
}

function statusClass(status: ContractIssue["status"]) {
  if (status === "fixed") return "bg-green-50 text-green-700";
  if (status === "false_alert") return "bg-gray-50 text-gray-600";
  return "bg-orange-50 text-orange-700";
}

function statusIcon(status: ContractIssue["status"]) {
  if (status === "fixed") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    );
  }
  if (status === "false_alert") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="8" x2="16" y2="16" />
        <line x1="8" y1="16" x2="16" y2="8" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ContractIssues({
  slug,
  userId,
  canAdmin,
  enabled,
}: {
  slug: string;
  userId?: string;
  canAdmin: boolean;
  enabled?: boolean;
}) {
  const [issues, setIssues] = useState<ContractIssue[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/issues`);
      if (!res.ok) throw new Error("Unable to load issues");
      const payload = (await res.json()) as { issues: ContractIssue[] };
      setIssues(payload.issues);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load issues");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!enabled || loaded) return;
    void fetchIssues();
  }, [enabled, loaded, fetchIssues]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || !userId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to create issue");
      }
      setBody("");
      await fetchIssues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create issue");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(issue: ContractIssue, status: ContractIssue["status"]) {
    setUpdatingId(issue.id);
    try {
      const res = await fetch(`/api/contract-issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to update issue");
      }
      await fetchIssues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update issue");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="contract-issues">
      <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">{t("issuesTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("issuesSubtitle")}</p>

        {userId ? (
          <form className="mt-4" onSubmit={handleSubmit}>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm text-gray-900"
              rows={4}
              placeholder={t("issuePlaceholder")}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              style={{ borderColor: "#e5e7eb" }}
            />
            <div className="mt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving || !body.trim()}
                className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                {saving ? t("creating") : t("createIssue")}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{t("signInToCreateIssue")}</p>
        )}
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-xl border bg-white px-4 py-6 text-sm text-gray-500 shadow-sm">{t("loadingIssues")}</p>
      ) : issues.length === 0 ? (
        <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
          {t("noIssues")}
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <article key={issue.id} id={`issue-${issue.id}`} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{issue.userId}</h3>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{issue.body}</p>
                  {issue.status !== "open" ? (
                    <div className="flex justify-end mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(issue.status)}`}>
                        {statusIcon(issue.status)}
                        {statusLabel(issue.status)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-gray-400">{formatDate(issue.createdAt)}</time>
              </div>

          {canAdmin ? (
            <div className="mt-4 inline-flex rounded-full border p-0.5" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
              {STATUSES.map((status) => {
                const activeBg = status === "open" ? "#1f2937" : status === "fixed" ? "#16a34a" : "#6b7280";
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={updatingId === issue.id}
                    className="inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: issue.status === status ? activeBg : "transparent",
                      color: issue.status === status ? "#fff" : activeBg,
                    }}
                    onClick={() => void handleStatusChange(issue, status)}
                  >
                    {statusIcon(status)}
                    {statusLabel(status)}
                  </button>
                );
              })}
            </div>
          ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
