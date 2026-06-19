"use client";

import { useCallback, useEffect, useState } from "react";

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
  if (status === "fixed") return "Fixed";
  if (status === "false_alert") return "False alert";
  return "Open";
}

function statusClass(status: ContractIssue["status"]) {
  if (status === "fixed") return "bg-green-50 text-green-700";
  if (status === "false_alert") return "bg-gray-50 text-gray-600";
  return "bg-orange-50 text-orange-700";
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
        <h2 className="text-base font-semibold text-gray-900">Issues</h2>
        <p className="mt-1 text-sm text-gray-500">Report errors, false alerts, or data quality problems.</p>

        {userId ? (
          <form className="mt-4" onSubmit={handleSubmit}>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm text-gray-900"
              rows={4}
              placeholder="Describe the issue..."
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
                {saving ? "Creating..." : "Create issue"}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Sign in to create an issue.</p>
        )}
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-xl border bg-white px-4 py-6 text-sm text-gray-500 shadow-sm">Loading issues...</p>
      ) : issues.length === 0 ? (
        <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
          No issues reported.
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <article key={issue.id} id={`issue-${issue.id}`} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{issue.userId}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(issue.status)}`}>
                      {statusLabel(issue.status)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{issue.body}</p>
                </div>
                <time className="shrink-0 text-xs text-gray-400">{formatDate(issue.createdAt)}</time>
              </div>

              {canAdmin ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingId === issue.id}
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${issue.status === status ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"} disabled:opacity-50`}
                      onClick={() => void handleStatusChange(issue, status)}
                    >
                      {statusLabel(status)}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
