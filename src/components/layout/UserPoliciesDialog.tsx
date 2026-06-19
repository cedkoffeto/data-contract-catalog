"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { AccessPolicyRecord } from "@/src/lib/access-control";

function RequestEditorForm({ onDone }: { onDone: () => void }) {
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!slug.trim()) return;
    setSending(true);
    try {
      await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: "",
          context: "",
          dataContract: slug.trim(),
          requestedPermission: "editor",
          message,
        }),
      });
      setSent(true);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return <p className="mt-2 text-sm font-medium text-green-600">Request sent to administrators.</p>;
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-dashed border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-700">Request editor access on a contract</p>
      <input
        type="text"
        placeholder="Contract slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="w-full rounded-md border px-2 py-1.5 text-xs text-gray-900 outline-none"
        style={{ borderColor: "#d1d5db" }}
      />
      <textarea
        rows={2}
        placeholder="Reason (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full rounded-md border px-2 py-1.5 text-xs text-gray-900 outline-none"
        style={{ borderColor: "#d1d5db" }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={sending || !slug.trim()}
        className="rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--ui-primary)" }}
      >
        {sending ? "Sending\u2026" : "Send request"}
      </button>
    </div>
  );
}

export function UserPoliciesDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [policies, setPolicies] = useState<AccessPolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoading(true);
    fetch(`/api/policies/effective?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => setPolicies(data.items ?? []))
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl" style={{ width: "min(70vw, 480px)" }}>
        <h3 className="text-base font-semibold text-gray-900">
          Policies for user: <span className="font-mono text-sm">{userId}</span>
        </h3>

        <p className="mt-1 text-xs text-gray-400">
          {policies.length} polic{policies.length !== 1 ? "ies" : "y"}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        ) : policies.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No policies found for this user.</p>
        ) : (
          <div className="mt-3 max-h-72 overflow-y-auto">
            <div className="space-y-1">
              {policies.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    {p.user_id ? "direct" : "group"}
                  </span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      background: p.permission_name === "admin" ? "#fef2f2" : p.permission_name === "editor" ? "#fff7ed" : "#f0f9ff",
                      color: p.permission_name === "admin" ? "#dc2626" : p.permission_name === "editor" ? "#f97316" : "#2563eb",
                    }}
                  >
                    {p.permission_name}
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {p.domain_scope ?? "all domains"}
                    {p.context_scope ? ` / ${p.context_scope}` : ""}
                    {p.data_contract_scope ? ` / ${p.data_contract_scope}` : ""}
                    {p.group_name ? ` • ${p.group_name}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowRequest(!showRequest)}
            className="text-xs font-semibold text-orange-600 hover:text-orange-800"
          >
            {showRequest ? "- Hide" : "+ Request editor access"}
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        {showRequest ? <RequestEditorForm onDone={() => setShowRequest(false)} /> : null}
      </div>
    </div>,
    document.body
  );
}