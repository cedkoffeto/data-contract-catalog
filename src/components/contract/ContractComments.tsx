"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ContractComment, UserProfile } from "@/src/lib/types";
import { t, tWith } from "@/src/lib/i18n";

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

function getInitials(name: string) {
  const parts = name.trim().split(/[\s_.-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function renderBody(body: string) {
  const parts = body.split(/(@[A-Za-z0-9_.-]+)/g);
  return parts.map((part, index) => {
    if (/^@[A-Za-z0-9_.-]+$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="rounded bg-blue-50 px-1 font-semibold text-blue-700">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function CommentBubble({
  comment,
  userId,
  onReply,
}: {
  comment: ContractComment;
  userId?: string;
  onReply: (comment: ContractComment) => void;
}) {
  return (
    <article id={`comment-${comment.id}`} className="group rounded-2xl border border-gray-200 bg-white p-3 shadow-sm scroll-mt-24">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
          {getInitials(comment.userId)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{comment.userId}</h3>
            <time className="text-xs text-gray-400">{formatDate(comment.createdAt)}</time>
          </div>
          <div className="mt-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700">
            {renderBody(comment.body)}
          </div>
          {comment.editedAt ? <p className="mt-1 text-xs text-gray-400">Edited</p> : null}
          {userId ? (
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              {t("reply")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ContractComments({
  slug,
  userId,
  onCommentCountChange,
  enabled,
}: {
  slug: string;
  userId?: string;
  onCommentCountChange?: (count: number) => void;
  enabled?: boolean;
}) {
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [body, setBody] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionEnd, setMentionEnd] = useState<number | null>(null);
  const [mentionTop, setMentionTop] = useState(16);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<ContractComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`);
      if (!res.ok) throw new Error("Unable to load comments");
      const payload = (await res.json()) as { comments: ContractComment[] };
      setComments(payload.comments);
      setLoaded(true);
      onCommentCountChange?.(payload.comments.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load comments");
    } finally {
      setLoading(false);
    }
  }, [slug, onCommentCountChange]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/users`);
      if (!res.ok) return;
      const payload = (await res.json()) as { users: UserProfile[] };
      setUsers(payload.users);
      setSelectedMentionIndex(0);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    void fetchUsers();
  }, [fetchUsers, userId]);

  useEffect(() => {
    if (!enabled || loaded) return;
    void fetchComments();
  }, [enabled, loaded, fetchComments]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#comment-")) return;
    const id = Number(hash.replace("#comment-", ""));
    if (!Number.isFinite(id)) return;
    window.setTimeout(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [comments]);

  function focusComposer() {
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function calculateMentionTop(value: string, cursor: number) {
    const lineHeight = 24;
    const topPadding = 14;
    const linesBeforeCursor = value.slice(0, cursor).split("\n").length;
    setMentionTop(Math.min(topPadding + (linesBeforeCursor - 1) * lineHeight, 180));
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    const cursor = event.target.selectionStart;
    setBody(value);

    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/@([A-Za-z0-9_.-]*)$/);
    if (match) {
      const start = cursor - match[0].length;
      setMentionStart(start);
      setMentionEnd(cursor);
      setMentionSearch(match[1]);
      calculateMentionTop(value, cursor);
      return;
    }

    setMentionStart(null);
    setMentionEnd(null);
    setMentionSearch("");
    setUsers([]);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!users.length || mentionStart === null || mentionEnd === null) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.min(current + 1, users.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMentionStart(null);
      setMentionEnd(null);
      setUsers([]);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectMention(users[selectedMentionIndex]);
    }
  }

  function selectMention(user: UserProfile | undefined) {
    if (!user || mentionStart === null || mentionEnd === null) return;

    const nextBody = `${body.slice(0, mentionStart)}@${user.userId}${body.slice(mentionEnd)}`;
    setBody(nextBody);
    setMentionStart(null);
    setMentionEnd(null);
    setMentionSearch("");
    setUsers([]);
    focusComposer();
  }

  async function submitComment() {
    const commentBody = body.trim();
    if (!commentBody || !userId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody, parentId: replyingTo?.id ?? null }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to post comment");
      }
      setBody("");
      setReplyingTo(null);
      await fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post comment");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submitComment();
  }

  const topComments = comments.filter((comment) => !comment.parentId);
  const filteredUsers = users.filter((user) => {
    if (!mentionSearch) return true;
    return [user.displayName, user.userId, user.firstName, user.lastName].some((value) => value.toLowerCase().includes(mentionSearch.toLowerCase()));
  });
  const repliesByParentId = comments.reduce<Record<number, ContractComment[]>>((acc, comment) => {
    if (!comment.parentId) return acc;
    acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
    return acc;
  }, {});

  return (
    <section className="contract-comments">
      {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-xl border bg-white px-4 py-6 text-sm text-gray-500 shadow-sm">{t("loadingDiscussion")}</p>
      ) : topComments.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
          {t("noComments")}
        </div>
      ) : (
        <div className="space-y-3">
          {topComments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentBubble
                comment={comment}
                userId={userId}
                onReply={(replyComment) => {
                  setReplyingTo(replyingTo?.id === replyComment.id ? null : replyComment);
                  setBody("");
                  focusComposer();
                }}
              />
              {repliesByParentId[comment.id]?.map((reply) => (
                <div key={reply.id} className="ml-8 border-l-2 border-orange-200 pl-4">
                  <CommentBubble
                    comment={reply}
                    userId={userId}
                    onReply={(replyComment) => {
                      setReplyingTo(replyingTo?.id === replyComment.id ? null : replyComment);
                      setBody("");
                      focusComposer();
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("commentsTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">{t("commentsSubtitle")}</p>
          </div>
          {replyingTo ? (
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800"
            >
              {t("cancelReply")}
            </button>
          ) : null}
        </div>

        {userId ? (
          <form className="relative" onSubmit={handleSubmit}>
            {replyingTo ? (
              <div className="mb-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
                {tWith("replyingTo", { user: replyingTo.userId })}
              </div>
            ) : null}
            <div className="rounded-2xl border bg-gray-50 p-3">
              <textarea
                ref={textareaRef}
                className="w-full resize-none bg-transparent text-sm leading-6 text-gray-900 outline-none"
                rows={4}
                placeholder={replyingTo ? t("replyPlaceholder") : t("startDiscussionPlaceholder")}
                value={body}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                style={{ borderColor: "#e5e7eb" }}
              />
            </div>

            {mentionStart !== null && mentionEnd !== null && filteredUsers.length > 0 ? (
              <div
                className="absolute z-20 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                style={{ top: mentionTop }}
              >
                {filteredUsers.map((user, index) => {
                  const isActive = index === selectedMentionIndex;
                  return (
                    <button
                      key={user.userId}
                      type="button"
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left ${isActive ? "bg-orange-50" : "bg-white hover:bg-gray-50"}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectMention(user);
                      }}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                        {getInitials(user.displayName)}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${isActive ? "text-orange-700" : "text-gray-900"}`}>
                          {user.displayName}
                        </p>
                        <p className="truncate text-xs text-gray-500">@{user.userId}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">{t("useMentionHint")}</p>
              <button
                type="submit"
                disabled={saving || !body.trim()}
                className="rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                {saving ? t("posting") : replyingTo ? t("reply") : t("postComment")}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{t("signInToComment")}</p>
        )}
      </div>
    </section>
  );
}
