"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ContractComment, ContractIssue, UserProfile } from "@/src/lib/types";
import { t, tWith } from "@/src/lib/i18n";

const STATUSES = ["open", "fixed", "false_alert"] as const;

function timeAgo(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
      {getInitials(name)}
    </div>
  );
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
    <div className="group flex gap-3">
      <Avatar name={comment.userId} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{comment.userId}</span>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>
        <div className="mt-1 rounded-2xl bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700">
          {renderBody(comment.body)}
        </div>
        {comment.editedAt ? <p className="mt-0.5 text-[11px] text-gray-400">Edited</p> : null}
        {userId ? (
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="mt-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            {t("reply")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  canAdmin,
  onStatusChange,
  updatingId,
}: {
  issue: ContractIssue;
  canAdmin: boolean;
  onStatusChange: (issue: ContractIssue, status: ContractIssue["status"]) => void;
  updatingId: number | null;
}) {
  const statusColors: Record<string, string> = {
    open: "bg-orange-50 text-orange-700 border-orange-200",
    fixed: "bg-green-50 text-green-700 border-green-200",
    false_alert: "bg-gray-50 text-gray-600 border-gray-200",
  };
  const statusLabels: Record<string, string> = {
    open: "Open",
    fixed: "Fixed",
    false_alert: "False alert",
  };

  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v3.75m0-5.25V9m0 12a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{issue.userId}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusColors[issue.status]}`}>
            {statusLabels[issue.status]}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(issue.createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{issue.body}</p>
        {canAdmin ? (
          <div className="mt-2 flex gap-1.5">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                disabled={updatingId === issue.id}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
                  issue.status === status
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                } disabled:opacity-50`}
                onClick={() => onStatusChange(issue, status)}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DiscussionThread({
  slug,
  userId,
  canAdmin,
  enabled,
  onCommentCountChange,
  onIssueCountChange,
}: {
  slug: string;
  userId?: string;
  canAdmin: boolean;
  enabled?: boolean;
  onCommentCountChange?: (count: number) => void;
  onIssueCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [issues, setIssues] = useState<ContractIssue[]>([]);
  const [body, setBody] = useState("");
  const [composerMode, setComposerMode] = useState<"comment" | "issue">("comment");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionEnd, setMentionEnd] = useState<number | null>(null);
  const [mentionTop, setMentionTop] = useState(16);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<ContractComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [commentsRes, issuesRes] = await Promise.all([
        fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`),
        fetch(`/api/contracts/${encodeURIComponent(slug)}/issues`),
      ]);
      if (!commentsRes.ok) throw new Error("Unable to load discussion");
      const commentsPayload = (await commentsRes.json()) as { comments: ContractComment[] };
      const issuesPayload = (await issuesRes.json()) as { issues: ContractIssue[] };
      setComments(commentsPayload.comments);
      setIssues(issuesPayload.issues);
      setLoaded(true);
      onCommentCountChange?.(commentsPayload.comments.length);
      onIssueCountChange?.(issuesPayload.issues.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load discussion");
    } finally {
      setLoading(false);
    }
  }, [slug, onCommentCountChange, onIssueCountChange]);

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
    if (loaded) return;
    void fetchThread();
  }, [loaded, fetchThread]);

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

    if (composerMode === "issue") {
      setMentionStart(null);
      setMentionEnd(null);
      setMentionSearch("");
      return;
    }

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
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!filteredUsers.length || mentionStart === null || mentionEnd === null) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.min(current + 1, filteredUsers.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMentionStart(null);
      setMentionEnd(null);
      setMentionSearch("");
      setSelectedMentionIndex(0);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectMention(filteredUsers[selectedMentionIndex]);
    }
  }

  function selectMention(user: UserProfile | undefined) {
    if (!user || mentionStart === null || mentionEnd === null) return;
    const nextBody = `${body.slice(0, mentionStart)}@${user.userId}${body.slice(mentionEnd)}`;
    setBody(nextBody);
    setMentionStart(null);
    setMentionEnd(null);
    setMentionSearch("");
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
      await fetchThread();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to post comment");
    } finally {
      setSaving(false);
    }
  }

  async function submitIssue() {
    const issueBody = body.trim();
    if (!issueBody || !userId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: issueBody }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to create issue");
      }
      setBody("");
      await fetchThread();
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
      await fetchThread();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update issue");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (composerMode === "comment") {
      await submitComment();
    } else {
      await submitIssue();
    }
  }

  const topComments = useMemo(
    () => comments.filter((comment) => !comment.parentId),
    [comments],
  );

  const repliesByParentId = useMemo(() => {
    return comments.reduce<Record<number, ContractComment[]>>((acc, comment) => {
      if (!comment.parentId) return acc;
      acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
      return acc;
    }, {});
  }, [comments]);

  const commentMap = useMemo(() => {
    const map = new Map<number, ContractComment>();
    comments.forEach((c) => map.set(c.id, c));
    return map;
  }, [comments]);

  const issueMap = useMemo(() => {
    const map = new Map<number, ContractIssue>();
    issues.forEach((i) => map.set(i.id, i));
    return map;
  }, [issues]);

  const threadItems = useMemo(() => {
    const items: Array<{ type: "comment" | "issue"; id: number; createdAt: string }> = [
      ...topComments.map((c) => ({ type: "comment" as const, id: c.id, createdAt: c.createdAt })),
      ...issues.map((i) => ({ type: "issue" as const, id: i.id, createdAt: i.createdAt })),
    ];
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [topComments, issues]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (!mentionSearch) return true;
        return [user.displayName, user.userId, user.firstName, user.lastName].some((value) =>
          value.toLowerCase().includes(mentionSearch.toLowerCase()),
        );
      }),
    [users, mentionSearch],
  );

  return (
    <section className="discussion-thread">
      {error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border bg-white px-4 py-6 text-sm text-gray-500 shadow-sm">{t("loadingDiscussion")}</p>
      ) : threadItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">
          {t("noComments")}
        </div>
      ) : (
        <div className="space-y-4">
          {threadItems.map((item) => {
            if (item.type === "comment") {
              const comment = commentMap.get(item.id);
              if (!comment) return null;
              return (
                <div key={`comment-${comment.id}`} id={`comment-${comment.id}`} className="space-y-2">
                  <CommentBubble
                    comment={comment}
                    userId={userId}
                    onReply={(replyComment) => {
                      setReplyingTo(replyingTo?.id === replyComment.id ? null : replyComment);
                      setBody("");
                      setComposerMode("comment");
                      focusComposer();
                    }}
                  />
                  {repliesByParentId[comment.id]?.map((reply) => (
                    <div key={`reply-${reply.id}`} className="ml-8 border-l-2 border-orange-200 pl-4">
                      <CommentBubble
                        comment={reply}
                        userId={userId}
                        onReply={(replyComment) => {
                          setReplyingTo(replyingTo?.id === replyComment.id ? null : replyComment);
                          setBody("");
                          setComposerMode("comment");
                          focusComposer();
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            }

            const issue = issueMap.get(item.id);
            if (!issue) return null;
            return (
              <div
                key={`issue-${issue.id}`}
                id={`issue-${issue.id}`}
                className="rounded-xl border border-red-100 bg-red-50/30 p-3"
              >
                <IssueCard
                  issue={issue}
                  canAdmin={canAdmin}
                  onStatusChange={handleStatusChange}
                  updatingId={updatingId}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("commentsTitle")}</h2>
            {t("commentsSubtitle") ? <p className="mt-1 text-sm text-gray-500">{t("commentsSubtitle")}</p> : null}
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
          <div className="mb-3 flex gap-1">
            <button
              type="button"
              onClick={() => {
                setComposerMode("comment");
                setReplyingTo(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                composerMode === "comment"
                  ? "bg-orange-100 text-orange-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Comment
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerMode("issue");
                setReplyingTo(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                composerMode === "issue"
                  ? "bg-red-100 text-red-800"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Report issue
            </button>
          </div>
        ) : null}

        {userId ? (
          <form className="relative" onSubmit={handleSubmit}>
            {replyingTo ? (
              <div className="mb-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
                {tWith("replyingTo", { user: replyingTo.userId })}
              </div>
            ) : null}
            <div
              className={`rounded-2xl border bg-gray-50 p-3 ${
                composerMode === "issue" ? "border-red-200 bg-red-50/30" : ""
              }`}
            >
              <textarea
                ref={textareaRef}
                className="w-full resize-none bg-transparent text-sm leading-6 text-gray-900 outline-none"
                rows={4}
                placeholder={
                  composerMode === "issue"
                    ? "Describe the issue..."
                    : replyingTo
                      ? t("replyPlaceholder")
                      : t("startDiscussionPlaceholder")
                }
                value={body}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {composerMode === "comment" && mentionStart !== null && mentionEnd !== null && filteredUsers.length > 0 ? (
              <div
                className="absolute z-20 w-72 overflow-hidden bg-white shadow-xl"
                style={{ top: mentionTop, maxHeight: "min(240px, 40vh)" }}
              >
                <div className="overflow-y-auto" style={{ maxHeight: "inherit" }}>
                  {filteredUsers.map((user, index) => {
                    const isActive = index === selectedMentionIndex;
                    return (
                      <button
                        key={user.userId}
                        type="button"
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                          isActive ? "bg-orange-50" : "hover:bg-gray-50"
                        }`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectMention(user);
                        }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                          {getInitials(user.displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`block truncate ${
                              isActive ? "font-semibold text-orange-700" : "font-medium text-gray-900"
                            }`}
                          >
                            {user.displayName}
                          </span>
                          <span className="block truncate text-xs text-gray-400">@{user.userId}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                {composerMode === "issue"
                  ? "Issues are visible to contract admins."
                  : t("useMentionHint")}
              </p>
              <button
                type="submit"
                disabled={saving || !body.trim()}
                className={`rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                  composerMode === "issue" ? "bg-red-600 hover:bg-red-700" : ""
                }`}
                style={composerMode === "comment" ? { backgroundColor: "var(--ui-primary)" } : undefined}
              >
                {saving
                  ? "Posting..."
                  : composerMode === "issue"
                    ? "Report issue"
                    : replyingTo
                      ? t("reply")
                      : t("postComment")}
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
