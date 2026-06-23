"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { AccessPolicyRecord } from "@/src/lib/access-control";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";

function RequestEditorForm({ onDone }: { onDone: () => void }) {
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contractOptions, setContractOptions] = useState<{ value: string; label: string; extra: string }[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  useEffect(() => {
    fetch("/api/contracts")
      .then((r) => r.json())
      .then((data: { items: { slug: string; title: string; domain: string }[] }) => {
        setContractOptions(
          (data.items ?? []).map((c) => ({
            value: c.slug,
            label: c.title || c.slug,
            extra: c.slug,
          }))
        );
      })
      .catch(() => setContractOptions([]))
      .finally(() => setLoadingContracts(false));
  }, []);

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
      {loadingContracts ? (
        <p className="text-xs text-gray-400">Loading contracts...</p>
      ) : (
        <SearchableSelect
          value={slug}
          onChange={setSlug}
          options={contractOptions}
          placeholder="Select a contract..."
        />
      )}
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
        disabled={sending || !slug.trim() || message.trim().length < 3}
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
  const [filter, setFilter] = useState("");

  const filteredPolicies = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return policies;
    return policies.filter((p) =>
      (p.user_id ? "direct" : "group").includes(q) ||
      p.permission_name.includes(q) ||
      (p.domain_scope ?? "").toLowerCase().includes(q) ||
      (p.context_scope ?? "").toLowerCase().includes(q) ||
      (p.data_contract_scope ?? "").toLowerCase().includes(q) ||
      (p.group_name ?? "").toLowerCase().includes(q)
    );
  }, [filter, policies]);

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
      <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl" style={{ width: "min(90vw, 960px)" }}>
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
          <div className="mt-3">
            <input
              type="text"
              placeholder="Type to filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="mb-2 w-full rounded-md border px-2 py-1.5 text-xs text-gray-900 outline-none"
              style={{ borderColor: "#d1d5db" }}
            />
            {filteredPolicies.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">No matching policies.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="px-3 py-1.5 font-medium">Type</th>
                      <th className="px-3 py-1.5 font-medium">Permission</th>
                      <th className="px-3 py-1.5 font-medium">Domain</th>
                      <th className="px-3 py-1.5 font-medium">Context</th>
                      <th className="px-3 py-1.5 font-medium">Contract</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPolicies.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                            {p.user_id ? "direct" : "group"}
                          </span>
                          {p.group_name && <span className="ml-1.5 font-mono text-gray-400">{p.group_name}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              background: p.permission_name === "admin" ? "#fef2f2" : p.permission_name === "editor" ? "#fff7ed" : "#f0f9ff",
                              color: p.permission_name === "admin" ? "#dc2626" : p.permission_name === "editor" ? "#f97316" : "#2563eb",
                            }}
                          >
                            {p.permission_name}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500">{p.domain_scope ?? "\u2014"}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{p.context_scope ?? "\u2014"}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{p.data_contract_scope ?? "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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