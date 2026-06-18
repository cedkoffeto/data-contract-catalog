"use client";

import { useCallback, useEffect, useState } from "react";

import type { ContractComment } from "@/src/lib/types";

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

function renderBody(body: string) {
  const parts = body.split(/(@[A-Za-z0-9_.-]+)/g);
  return parts.map((part, index) => {
    if (/^@[A-Za-z0-9_.-]+$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="rounded bg-orange-100 px-1 font-semibold text-orange-800">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function ContractComments({ slug, userId }: { slug: string; userId?: string }) {
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`);
      if (!res.ok) throw new Error("Unable to load comments");
      const payload = (await res.json()) as { comments: ContractComment[] };
      setComments(payload.comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load comments");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#comment-")) return;
    const id = Number(hash.replace("#comment-", ""));
    if (!Number.isFinite(id)) return;
    window.setTimeout(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [comments]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || !userId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to post comment");
      }
      setBody("");
      await fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post comment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="contract-comments">
      <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Comments</h2>
        <p className="mt-1 text-sm text-gray-500">Discuss this contract with your team.</p>

        {userId ? (
          <form className="mt-4" onSubmit={handleSubmit}>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm text-gray-900"
              rows={4}
              placeholder="Write a comment..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
              style={{ borderColor: "#e5e7eb" }}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">Use @username to mention a user.</p>
              <button
                type="submit"
                disabled={saving || !body.trim()}
                className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                {saving ? "Posting..." : "Post comment"}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Sign in to comment.</p>
        )}
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-xl border bg-white px-4 py-6 text-sm text-gray-500 shadow-sm">Loading comments...</p>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
          No comments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <article key={comment.id} id={`comment-${comment.id}`} className="rounded-xl border bg-white p-4 shadow-sm scroll-mt-24">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{comment.userId}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{renderBody(comment.body)}</p>
                </div>
                <time className="shrink-0 text-xs text-gray-400">{formatDate(comment.createdAt)}</time>
              </div>
              {comment.editedAt ? <p className="mt-2 text-xs text-gray-400">Edited</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
