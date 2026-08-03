"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import getCaretCoordinates from "textarea-caret";

import type { ContractComment, ContractField, ContractIssue, UserProfile } from "@/src/lib/types";
import { useT } from "@/src/lib/use-i18n";
import { useClickOutside } from "@/src/hooks/useClickOutside";

const STATUSES = ["open", "fixed", "false_alert"] as const;

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 2) return `Yesterday`;
  if (days < 7) return `${days}d ago`;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/[\s_.-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function renderBody(body: string, userMap?: Map<string, UserProfile>) {
  const parts = body.split(/(@[\p{L}\p{N}_.]+)/gu);
  return parts.map((part, index) => {
    if (/^@[\p{L}\p{N}_.]+$/u.test(part)) {
      const userId = part.slice(1);
      const user = userMap?.get(userId);
      const displayName = user ? `@${user.firstName} ${user.lastName}` : part;
      return (
        <span key={`${part}-${index}`} title={user ? user.userId : userId} className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
          {displayName}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

type CommentNode = ContractComment & { replies: CommentNode[] };

function parseCommentsToTree(flatComments: ContractComment[]): CommentNode[] {
  const map = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of flatComments) {
    map.set(c.id, { ...c, replies: [] });
  }
  for (const c of flatComments) {
    const node = map.get(c.id);
    if (!node) continue;
    if (c.parentId && map.has(c.parentId)) {
      const parent = map.get(c.parentId);
      if (parent) parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function Avatar({ name, displayName }: { name: string; displayName?: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700" title={displayName || name}>
      {getInitials(name)}
    </div>
  );
}

const CommentItem = memo(function CommentItem({
  comment,
  parentUser,
  isCurrentUser,
  userId,
  users,
  onReply,
  onDelete,
}: {
  comment: ContractComment;
  parentUser?: string;
  isCurrentUser: boolean;
  userId?: string;
  users: UserProfile[];
  onReply?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useT();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const userMap = useMemo(() => new Map(users.map((u) => [u.userId, u])), [users]);
  const user = userMap.get(comment.userId);
  const displayName = user ? `${user.firstName} ${user.lastName}` : comment.userId;

  const handleDelete = async () => {
    if (deleting || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const parentUserProfile = parentUser ? userMap.get(parentUser) : undefined;
  const parentDisplayName = parentUserProfile ? `${parentUserProfile.firstName} ${parentUserProfile.lastName}` : parentUser;

  return (
    <div className="comment-item group/comment">
      <div className="comment-item__avatar">
        <Avatar name={displayName} displayName={displayName} />
      </div>
      <div className="comment-item__body" style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "6px 8px" }}>
        <div className="comment-item__heading">
          <div className="flex items-center gap-2">
            <strong>{displayName}</strong>
            {parentUser ? (
              <span className="meta">
                In reply to <span className="font-medium text-gray-600">@{parentDisplayName}</span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="meta"><span className="text-gray-600">{formatDate(comment.createdAt)}</span> {new Date(comment.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="comment-item__text">{renderBody(comment.body, userMap)}</div>
        {comment.targetFields?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {comment.targetFields.map((field) => (
              <span key={field} className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4v7l9 9 7-7-9-9z" />
                  <line x1="18.5" y1="9.5" x2="11" y2="2" />
                </svg>
                {field}
              </span>
            ))}
          </div>
        ) : null}
        {comment.editedAt ? <span className="meta">Edited</span> : null}
        {userId ? (
          <div className="comment-item__actions" style={{ padding: "6px 0", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={onReply}
              className="cursor-pointer flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-800"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6 6-6" />
              </svg>
              {t("reply")}
            </button>
            {isCurrentUser && !confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="cursor-pointer text-slate-400 hover:text-red-500 transition-opacity"
                title="Delete"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            ) : null}
            {isCurrentUser && confirming ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-600">Delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="cursor-pointer font-bold text-red-600 hover:text-red-800 disabled:opacity-30"
                >
                  &#10003;
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="cursor-pointer font-bold text-gray-600 hover:text-gray-700 disabled:opacity-30"
                >
                  &#10005;
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});

function InlineReplyForm({
  comment,
  slug,
  userId,
  users,
  fields = [],
  onClose,
  onPosted,
}: {
  comment: ContractComment;
  slug: string;
  userId?: string;
  users: UserProfile[];
  fields?: ContractField[];
  onClose: () => void;
  onPosted: () => void;
}) {
  const { t } = useT();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionEnd, setMentionEnd] = useState<number | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldStart, setFieldStart] = useState<number | null>(null);
  const [fieldEnd, setFieldEnd] = useState<number | null>(null);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const caretPosRef = useRef({ top: 0, left: 0, height: 0 });

  useEffect(() => {
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

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

  const filteredFields = useMemo(
    () =>
      fields.filter((f) => {
        if (!fieldSearch) return true;
        return (f.name ?? "").toLowerCase().includes(fieldSearch.toLowerCase());
      }),
    [fields, fieldSearch],
  );

  const replyShowMention = mentionStart !== null && mentionEnd !== null && filteredUsers.length > 0;
  const replyShowField = fieldStart !== null && fieldEnd !== null && filteredFields.length > 0;

  useEffect(() => {
    if ((!replyShowMention && !replyShowField) || !mentionRef.current || !textareaRef.current) return;

    const textarea = textareaRef.current;

    function position() {
      if (!mentionRef.current) return;
      const textareaRect = textarea.getBoundingClientRect();
      const caret = caretPosRef.current;
      const POPOVER_HEIGHT = 200;
      const GAP = 8;

      let top = textareaRect.top + caret.top - POPOVER_HEIGHT - GAP;
      const left = textareaRect.left + caret.left;

      if (top < 0) {
        top = textareaRect.top + caret.top + caret.height + GAP;
      }

      mentionRef.current.style.top = `${top}px`;
      mentionRef.current.style.left = `${left}px`;
      mentionRef.current.style.setProperty("position", "fixed");
      mentionRef.current.style.setProperty("background", "white", "important");
    }

    position();
    window.addEventListener("scroll", position, { passive: true });
    return () => window.removeEventListener("scroll", position);
  }, [replyShowMention, replyShowField]);

  async function handlePost() {
    if (!body.trim() || !userId) return;
    setSaving(true);
    try {
      const refs = body.match(/#([\p{L}\p{N}_.-]+)/gu);
      const targetFields = refs?.length
        ? [...new Set(refs.map((r) => r.slice(1)).filter((n) => fields.some((f) => f.name === n)))]
        : undefined;
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), parentId: comment.id, targetFields }),
      });
      if (!res.ok) throw new Error("Failed to post reply");
      setBody("");
      onPosted();
    } catch {
      // handled by parent fetchThread
    } finally {
      setSaving(false);
    }
  }

  function selectMention(user: UserProfile | undefined) {
    if (!user || mentionStart === null || mentionEnd === null) return;
    const suffix = body.slice(mentionEnd);
    const trailing = suffix.startsWith(" ") ? "" : " ";
    const nextBody = `${body.slice(0, mentionStart)}@${user.userId}${trailing}${suffix}`;
    setBody(nextBody);
    setMentionStart(null);
    setMentionEnd(null);
    setMentionSearch("");
    setSelectedMentionIndex(0);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function selectField(field: ContractField | undefined) {
    if (!field?.name || fieldStart === null || fieldEnd === null) return;
    const suffix = body.slice(fieldEnd);
    const trailing = suffix.startsWith(" ") ? "" : " ";
    const nextBody = `${body.slice(0, fieldStart)}#${field.name}${trailing}${suffix}`;
    setBody(nextBody);
    setFieldStart(null);
    setFieldEnd(null);
    setFieldSearch("");
    setSelectedFieldIndex(0);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    const cursor = event.target.selectionStart;
    setBody(value);

    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    const beforeCursor = value.slice(0, cursor);
    const mentionMatch = beforeCursor.match(/@([\p{L}\p{N}_.-]*)$/u);
    if (mentionMatch) {
      const start = cursor - mentionMatch[0].length;
      setMentionStart(start);
      setMentionEnd(cursor);
      setMentionSearch(mentionMatch[1]);
      setSelectedMentionIndex(0);
      const caret = getCaretCoordinates(el, cursor);
      caretPosRef.current = { top: caret.top, left: caret.left, height: caret.height };
      setFieldStart(null);
      setFieldEnd(null);
      setFieldSearch("");
      return;
    }

    const fieldMatch = beforeCursor.match(/#([\p{L}\p{N}_.-]*)$/u);
    if (fieldMatch) {
      const start = cursor - fieldMatch[0].length;
      setFieldStart(start);
      setFieldEnd(cursor);
      setFieldSearch(fieldMatch[1]);
      setSelectedFieldIndex(0);
      const caret = getCaretCoordinates(el, cursor);
      caretPosRef.current = { top: caret.top, left: caret.left, height: caret.height };
      setMentionStart(null);
      setMentionEnd(null);
      setMentionSearch("");
      return;
    }

    setMentionStart(null);
    setMentionEnd(null);
    setMentionSearch("");
    setFieldStart(null);
    setFieldEnd(null);
    setFieldSearch("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      if (event.shiftKey) return;
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        void handlePost();
        return;
      }
      if (mentionStart !== null) {
        event.preventDefault();
        selectMention(filteredUsers[selectedMentionIndex]);
        return;
      }
      if (fieldStart !== null) {
        event.preventDefault();
        selectField(filteredFields[selectedFieldIndex]);
        return;
      }
      event.preventDefault();
      void handlePost();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (mentionStart !== null) {
        setMentionStart(null);
        setMentionEnd(null);
        setMentionSearch("");
        setSelectedMentionIndex(0);
        return;
      }
      if (fieldStart !== null) {
        setFieldStart(null);
        setFieldEnd(null);
        setFieldSearch("");
        setSelectedFieldIndex(0);
        return;
      }
      onClose();
      return;
    }

    if (fieldStart !== null && fieldEnd !== null && filteredFields.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedFieldIndex((current) => Math.min(current + 1, filteredFields.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedFieldIndex((current) => Math.max(current - 1, 0));
        return;
      }
    }

    if (mentionStart === null || mentionEnd === null || filteredUsers.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.min(current + 1, filteredUsers.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.max(current - 1, 0));
    }
  }

  return (
    <div style={{ marginLeft: "20px", paddingLeft: "24px", paddingTop: "0.25rem", paddingBottom: "0.25rem" }}>
      <textarea
        ref={textareaRef}
        className="w-full resize-none rounded-lg border border-gray-200 bg-white p-2.5 text-sm leading-5 text-gray-900 outline-none"
        rows={2}
        placeholder={t("replyPlaceholder")}
        value={body}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
      />

      {replyShowMention ? (
        <div
          ref={mentionRef}
          className="z-50 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          style={{ position: "fixed", maxHeight: "min(200px, 40vh)" }}
        >
          <div className="overflow-y-auto bg-white py-1 mention-scroll" style={{ maxHeight: "inherit" }}>
            {filteredUsers.map((user, index) => {
              const isActive = index === selectedMentionIndex;
              return (
                <button
                  key={user.userId}
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    isActive ? "bg-orange-50" : "hover:bg-orange-50"
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectMention(user);
                  }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                    {getInitials(user.displayName)}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <span
                      className={`block truncate ${
                        isActive ? "font-semibold text-orange-700" : "font-medium text-slate-900"
                      }`}
                    >
                      @{user.firstName} {user.lastName}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{user.userId}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="text-xs text-gray-400">{t("useMentionHint")}</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handlePost}
            disabled={saving || !body.trim()}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--ui-primary)" }}
          >
            {saving ? t("posting") : t("reply")}
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  canAdmin,
  onStatusChange,
  updatingId,
  users,
}: {
  issue: ContractIssue;
  canAdmin: boolean;
  onStatusChange: (issue: ContractIssue, status: ContractIssue["status"]) => void;
  updatingId: number | null;
  users: UserProfile[];
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

  const statusIcons: Record<string, React.ReactNode> = {
    open: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    fixed: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    false_alert: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="8" x2="16" y2="16" />
        <line x1="8" y1="16" x2="16" y2="8" />
      </svg>
    ),
  };


  const userMap = useMemo(() => new Map(users.map((u) => [u.userId, u])), [users]);
  const user = userMap.get(issue.userId);
  const displayName = user ? `${user.firstName} ${user.lastName}` : issue.userId;

  return (
    <div className="comment-item" style={{ paddingTop: "10px", paddingBottom: "10px" }}>
      <div className="comment-item__avatar">
        <Avatar name={displayName} displayName={displayName} />
      </div>
      <div className="comment-item__body" style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: "6px 8px" }}>
        <div className="comment-item__heading">
          <strong>{displayName}</strong>
          <span className="meta"><span className="text-gray-600">{formatDate(issue.createdAt)}</span> {new Date(issue.createdAt).toLocaleString()}</span>
        </div>
        <div className="comment-item__text" style={{ whiteSpace: "pre-wrap" }}>{issue.body}</div>
        {issue.status !== "open" && !canAdmin ? (
          <div className="flex justify-end mt-1">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusColors[issue.status]}`}>
              {statusIcons[issue.status]}
              {statusLabels[issue.status]}
            </span>
          </div>
        ) : null}
        {canAdmin ? (
          <div className="comment-item__actions">
            <div className="inline-flex rounded-full border p-0.5" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
              {STATUSES.map((status) => {
                const activeBg = status === "open" ? "#1f2937" : status === "fixed" ? "#16a34a" : "#6b7280";
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={updatingId === issue.id}
                    className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: issue.status === status ? activeBg : "transparent",
                      color: issue.status === status ? "#fff" : activeBg,
                    }}
                    onClick={() => onStatusChange(issue, status)}
                  >
                    {statusIcons[status]}
                    {statusLabels[status]}
                  </button>
                );
              })}
            </div>
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
  onCommentCountChange,
  onIssueCountChange,
  fields = [],
}: {
  slug: string;
  userId?: string;
  canAdmin: boolean;
  onCommentCountChange?: (count: number) => void;
  onIssueCountChange?: (count: number) => void;
  fields?: ContractField[];
}) {
  const { t } = useT();
  const [comments, setComments] = useState<ContractComment[]>([]);
  const [issues, setIssues] = useState<ContractIssue[]>([]);
  const [body, setBody] = useState("");
  const [composerMode, setComposerMode] = useState<"comment" | "issue">("comment");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionEnd, setMentionEnd] = useState<number | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldStart, setFieldStart] = useState<number | null>(null);
  const [fieldEnd, setFieldEnd] = useState<number | null>(null);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<ContractComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "comments" | "issues">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/discussion-data`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Unable to load discussion");
      }
      const payload = (await res.json()) as {
        comments: ContractComment[];
        issues: ContractIssue[];
        users: UserProfile[];
      };
      setComments(payload.comments);
      setIssues(payload.issues);
      setUsers(payload.users);
      setSelectedMentionIndex(0);
      setLoaded(true);
      onCommentCountChange?.(payload.comments.length);
      onIssueCountChange?.(payload.issues.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load discussion");
    } finally {
      setLoading(false);
    }
  }, [slug, onCommentCountChange, onIssueCountChange]);

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

  const mentionRef = useRef<HTMLDivElement>(null);
  const caretPosRef = useRef({ top: 0, left: 0, height: 0 });

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    const cursor = event.target.selectionStart;
    setBody(value);

    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;

    if (composerMode === "issue") {
      setMentionStart(null);
      setMentionEnd(null);
      setMentionSearch("");
      setFieldStart(null);
      setFieldEnd(null);
      setFieldSearch("");
      return;
    }

    const beforeCursor = value.slice(0, cursor);
    const mentionMatch = beforeCursor.match(/@([\p{L}\p{N}_.-]*)$/u);
    if (mentionMatch) {
      const start = cursor - mentionMatch[0].length;
      setMentionStart(start);
      setMentionEnd(cursor);
      setMentionSearch(mentionMatch[1]);
      const caret = getCaretCoordinates(el, cursor);
      caretPosRef.current = { top: caret.top, left: caret.left, height: caret.height };
      setFieldStart(null);
      setFieldEnd(null);
      setFieldSearch("");
      return;
    }

    const fieldMatch = beforeCursor.match(/#([\p{L}\p{N}_.-]*)$/u);
    if (fieldMatch) {
      const start = cursor - fieldMatch[0].length;
      setFieldStart(start);
      setFieldEnd(cursor);
      setFieldSearch(fieldMatch[1]);
      const caret = getCaretCoordinates(el, cursor);
      caretPosRef.current = { top: caret.top, left: caret.left, height: caret.height };
      setMentionStart(null);
      setMentionEnd(null);
      setMentionSearch("");
      return;
    }

    setMentionStart(null);
    setMentionEnd(null);
    setMentionSearch("");
    setFieldStart(null);
    setFieldEnd(null);
    setFieldSearch("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      if (event.shiftKey) return;
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        if (!saving && body.trim()) void handleSubmit();
        return;
      }
      if (composerMode === "comment" && mentionStart !== null) {
        event.preventDefault();
        selectMention(filteredUsers[selectedMentionIndex]);
        return;
      }
      if (composerMode === "comment" && fieldStart !== null) {
        event.preventDefault();
        selectField(filteredFields[selectedFieldIndex]);
        return;
      }
      event.preventDefault();
      if (!saving && body.trim()) void handleSubmit();
      return;
    }

    if (event.key === "Escape") {
      if (mentionStart !== null) {
        event.preventDefault();
        setMentionStart(null);
        setMentionEnd(null);
        setMentionSearch("");
        setSelectedMentionIndex(0);
        return;
      }
      if (fieldStart !== null) {
        event.preventDefault();
        setFieldStart(null);
        setFieldEnd(null);
        setFieldSearch("");
        setSelectedFieldIndex(0);
        return;
      }
      return;
    }

    if (fieldStart !== null && fieldEnd !== null && filteredFields.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedFieldIndex((current) => Math.min(current + 1, filteredFields.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedFieldIndex((current) => Math.max(current - 1, 0));
        return;
      }
    }

    if (mentionStart === null || mentionEnd === null || filteredUsers.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.min(current + 1, filteredUsers.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((current) => Math.max(current - 1, 0));
    }
  }

  function selectMention(user: UserProfile | undefined) {
    if (!user || mentionStart === null || mentionEnd === null) return;
    const suffix = body.slice(mentionEnd);
    const trailing = suffix.startsWith(" ") ? "" : " ";
    const nextBody = `${body.slice(0, mentionStart)}@${user.userId}${trailing}${suffix}`;
    setBody(nextBody);
    setMentionStart(null);
    setMentionEnd(null);
    setMentionSearch("");
    focusComposer();
  }

  function selectField(field: ContractField | undefined) {
    if (!field?.name || fieldStart === null || fieldEnd === null) return;
    const suffix = body.slice(fieldEnd);
    const trailing = suffix.startsWith(" ") ? "" : " ";
    const nextBody = `${body.slice(0, fieldStart)}#${field.name}${trailing}${suffix}`;
    setBody(nextBody);
    setFieldStart(null);
    setFieldEnd(null);
    setFieldSearch("");
    focusComposer();
  }

  async function submitComment() {
    const commentBody = body.trim();
    if (!commentBody || !userId) return;
    setSaving(true);
    setError(null);
    try {
      const refs = commentBody.match(/#([\p{L}\p{N}_.-]+)/gu);
      const targetFields = refs?.length
        ? [...new Set(refs.map((r) => r.slice(1)).filter((n) => fields.some((f) => f.name === n)))]
        : undefined;
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody, parentId: replyingTo?.id ?? null, targetFields }),
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
      // Optimistic update: update issue in local state without refetching everything
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status } : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update issue");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteComment(commentId: number) {
    try {
      const res = await fetch(`/api/contracts/${slug}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete comment");
      }
      const afterDelete = comments.filter((c) => c.id !== commentId);
      setComments(afterDelete);
      onCommentCountChange?.(afterDelete.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete comment");
    }
  }

  async function handleSubmit() {
    if (composerMode === "comment") {
      await submitComment();
    } else {
      await submitIssue();
    }
  }

  const commentTree = useMemo(() => parseCommentsToTree(comments), [comments]);

  const rootCommentMap = useMemo(() => {
    const map = new Map<number, CommentNode>();
    commentTree.forEach((c) => map.set(c.id, c));
    return map;
  }, [commentTree]);

  const issueMap = useMemo(() => {
    const map = new Map<number, ContractIssue>();
    issues.forEach((i) => map.set(i.id, i));
    return map;
  }, [issues]);

  const threadItems = useMemo(() => {
    const items: Array<{ type: "comment" | "issue"; id: number; createdAt: string }> = [
      ...commentTree.map((c) => ({ type: "comment" as const, id: c.id, createdAt: c.createdAt })),
      ...issues.map((i) => ({ type: "issue" as const, id: i.id, createdAt: i.createdAt })),
    ];
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [commentTree, issues]);

  const filteredItems = useMemo(() => {
    const items = typeFilter === "all" ? threadItems : threadItems.filter((item) => item.type === typeFilter.slice(0, -1));
    if (sortOrder === "oldest") {
      return [...items].reverse();
    }
    return items;
  }, [threadItems, typeFilter, sortOrder]);

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

  const filteredFields = useMemo(
    () =>
      fields.filter((f) => {
        if (!fieldSearch) return true;
        return (f.name ?? "").toLowerCase().includes(fieldSearch.toLowerCase());
      }),
    [fields, fieldSearch],
  );

  const showMention = composerMode === "comment" && mentionStart !== null && mentionEnd !== null && filteredUsers.length > 0;
  const showFieldMention = composerMode === "comment" && fieldStart !== null && fieldEnd !== null && filteredFields.length > 0;

  useEffect(() => {
    if ((!showMention && !showFieldMention) || !mentionRef.current || !textareaRef.current) return;

    const textarea = textareaRef.current;

    function position() {
      if (!mentionRef.current) return;
      const textareaRect = textarea.getBoundingClientRect();
      const caret = caretPosRef.current;
      const POPOVER_HEIGHT = 240;
      const GAP = 8;

      let top = textareaRect.top + caret.top - POPOVER_HEIGHT - GAP;
      const left = textareaRect.left + caret.left;

      if (top < 0) {
        top = textareaRect.top + caret.top + caret.height + GAP;
      }

      mentionRef.current.style.top = `${top}px`;
      mentionRef.current.style.left = `${left}px`;
      mentionRef.current.style.setProperty("position", "fixed");
      mentionRef.current.style.setProperty("background", "white", "important");
    }

    position();
    window.addEventListener("scroll", position, { passive: true });
    return () => window.removeEventListener("scroll", position);
  }, [showMention, showFieldMention]);

  useClickOutside(composerRef, () => {
    if (mentionStart !== null && mentionEnd !== null) {
      setMentionStart(null);
      setMentionEnd(null);
      setMentionSearch("");
    }
    if (fieldStart !== null && fieldEnd !== null) {
      setFieldStart(null);
      setFieldEnd(null);
      setFieldSearch("");
    }
  }, showMention || showFieldMention);

  function renderCommentTree(node: CommentNode, parentUserId?: string): React.ReactNode {
    const isReplyingToThis = replyingTo?.id === node.id;
    return (
      <div key={`comment-${node.id}`} id={`comment-${node.id}`} className="comment-thread">
        <CommentItem
          comment={node}
          parentUser={parentUserId}
          isCurrentUser={node.userId === userId}
          userId={userId}
          users={users}
          onReply={() => setReplyingTo(isReplyingToThis ? null : node)}
          onDelete={node.userId === userId ? () => handleDeleteComment(node.id) : undefined}
        />
        {isReplyingToThis ? (
          <InlineReplyForm
            comment={node}
            slug={slug}
            userId={userId}
            users={users}
            onClose={() => setReplyingTo(null)}
            onPosted={() => { setReplyingTo(null); void fetchThread(); }}
          />
        ) : null}
        {node.replies.length > 0 ? (
          <div className="comment-replies">
            {node.replies.map((reply) => renderCommentTree(reply, node.userId))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="discussion-thread">
      {error ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border bg-white px-4 py-6 text-sm text-gray-600 shadow-sm">{t("loadingDiscussion")}</p>
      ) : filteredItems.length === 0 ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Discussion</h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg p-0.5" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
                {(["all", "comments", "issues"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTypeFilter(mode)}
                    className="inline-flex items-center rounded px-2.5 py-1 text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: typeFilter === mode ? "#1f2937" : "transparent",
                      color: typeFilter === mode ? "#fff" : "#374151",
                    }}
                  >
                    {mode === "all" ? t("filterAll") : mode === "comments" ? t("filterComments") : t("issuesTitle")}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => prev === "newest" ? "oldest" : "newest")}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: "#6b7280",
                  borderColor: "#d1d5db",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {sortOrder === "newest" ? (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </>
                  ) : (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="5 12 12 5 19 12" />
                    </>
                  )}
                </svg>
                {sortOrder === "newest" ? t("sortNewest") : t("sortOldest")}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-gray-600 shadow-sm">
            {threadItems.length === 0 ? t("noComments") : t("noFilterMatch")}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t("discussionTitle")}</h2>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg p-0.5" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
                {(["all", "comments", "issues"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTypeFilter(mode)}
                    className="inline-flex items-center rounded px-2.5 py-1 text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: typeFilter === mode ? "#1f2937" : "transparent",
                      color: typeFilter === mode ? "#fff" : "#374151",
                    }}
                  >
                    {mode === "all" ? t("filterAll") : mode === "comments" ? t("filterComments") : t("issuesTitle")}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => prev === "newest" ? "oldest" : "newest")}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: "#6b7280",
                  borderColor: "#d1d5db",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {sortOrder === "newest" ? (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </>
                  ) : (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="5 12 12 5 19 12" />
                    </>
                  )}
                </svg>
                {sortOrder === "newest" ? t("sortNewest") : t("sortOldest")}
              </button>
            </div>
          </div>
          <div className="space-y-4">
          {filteredItems.map((item) => {
            if (item.type === "comment") {
              const node = rootCommentMap.get(item.id);
              if (!node) return null;
              return renderCommentTree(node);
            }

            const issue = issueMap.get(item.id);
            if (!issue) return null;
            return (
              <div key={`issue-${issue.id}`} id={`issue-${issue.id}`}>
                <IssueCard
                  issue={issue}
                  canAdmin={canAdmin}
                  onStatusChange={handleStatusChange}
                  updatingId={updatingId}
                  users={users}
                />
              </div>
            );
          })}
        </div>
        </>
      )}

      <div ref={composerRef} className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">

        {userId ? (
          <form className="relative" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex rounded-lg p-0.5" style={{ backgroundColor: "rgba(249, 115, 22, 0.1)" }}>
                <button
                  type="button"
                  onClick={() => setComposerMode("comment")}
                  className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                    composerMode === "comment"
                      ? "text-white"
                      : "text-amber-800"
                  }`}
                  style={composerMode === "comment" ? { backgroundColor: "var(--ui-primary)" } : { backgroundColor: "transparent" }}
                >
                  <svg className="mr-1 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.5 8.25h9m-9 3.75h6.75m-6.75 3.75h3.75M21 12c0 4.142-3.582 7.5-8 7.5a8.8 8.8 0 0 1-2.25-.29L6 20.25l.9-3.15A7.05 7.05 0 0 1 5 12c0-4.142 3.582-7.5 8-7.5s8 3.358 8 7.5Z" />
                  </svg>
                  {t("addComment")}
                </button>
                <button
                  type="button"
                  onClick={() => { setComposerMode("issue"); setMentionStart(null); setMentionEnd(null); setMentionSearch(""); }}
                  className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                    composerMode === "issue"
                      ? "text-white"
                      : "text-amber-800"
                  }`}
                  style={composerMode === "issue" ? { backgroundColor: "#dc2626" } : { backgroundColor: "transparent" }}
                >
                  <svg className="mr-1 h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v3.75m0-5.25V9m0 12a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                  </svg>
                  {t("reportIssue")}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {composerMode === "issue" ? t("reportIssueHint") : t("useMentionHint")}
              </p>
            </div>
            <div
              className={`rounded-2xl border bg-gray-50 p-3 ${
                composerMode === "issue" ? "border-red-300 bg-red-50/30" : "border-gray-200"
              }`}
            >
              <textarea
                ref={textareaRef}
                className="w-full resize-none overflow-hidden bg-transparent text-sm leading-6 text-gray-900 outline-none"
                rows={3}
                placeholder={
                  composerMode === "issue"
                    ? t("issuePlaceholder")
                    : t("startDiscussionPlaceholder")
                }
                value={body}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {showFieldMention ? (
              <div
                ref={mentionRef}
                className="z-50 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
                style={{ position: "fixed", maxHeight: "min(240px, 40vh)" }}
              >
                <div className="overflow-y-auto bg-white py-1 mention-scroll" style={{ maxHeight: "inherit" }}>
                  <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t("fieldsLabel")}
                  </div>
                  {filteredFields.map((field, index) => {
                    const isActive = index === selectedFieldIndex;
                    return (
                      <button
                        key={field.name}
                        type="button"
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          isActive ? "bg-orange-50" : "hover:bg-orange-50"
                        }`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectField(field);
                        }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          #
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <span
                            className={`block truncate ${
                              isActive ? "font-semibold text-orange-700" : "font-medium text-slate-900"
                            }`}
                          >
                            #{field.name}
                          </span>
                          {field.description ? (
                            <span className="block truncate text-xs text-slate-500">{field.description}</span>
                          ) : field.type ? (
                            <span className="block truncate text-xs text-slate-400">{field.type}</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {showMention ? (
              <div
                ref={mentionRef}
                className="z-50 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
                style={{ position: "fixed", maxHeight: "min(240px, 40vh)" }}
              >
                <div className="overflow-y-auto bg-white py-1 mention-scroll" style={{ maxHeight: "inherit" }}>
                  {filteredUsers.map((user, index) => {
                    const isActive = index === selectedMentionIndex;
                    return (
                      <button
                        key={user.userId}
                        type="button"
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          isActive ? "bg-orange-50" : "hover:bg-orange-50"
                        }`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectMention(user);
                        }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                          {getInitials(user.displayName)}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <span
                            className={`block truncate ${
                              isActive ? "font-semibold text-orange-700" : "font-medium text-slate-900"
                            }`}
                          >
                            @{user.firstName} {user.lastName}
                          </span>
                          <span className="block truncate text-xs text-slate-500">{user.userId}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                {composerMode === "issue" ? t("reportIssueHint") : t("useMentionHint")}
              </p>
              <button
                type="submit"
                disabled={saving || !body.trim()}
                className="rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                style={{
                  backgroundColor: composerMode === "issue" ? "#dc2626" : "var(--ui-primary)",
                }}
              >
                {saving
                  ? t("posting")
                  : composerMode === "issue"
                    ? t("reportIssue")
                    : t("postComment")}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-gray-600">{t("signInToComment")}</p>
        )}
      </div>
    </section>
  );
}
