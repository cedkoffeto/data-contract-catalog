"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { AccessPolicyRecord } from "@/src/lib/access-control";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";

import { useT } from "@/src/lib/use-i18n";

function RequestEditorForm({ onDone }: { onDone: () => void }) {
  const { t, tWith } = useT();
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contractOptions, setContractOptions] = useState<{ value: string; label: string; extra: string }[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const contractMap = useRef<Record<string, { domain: string; context: string }>>({});

  useEffect(() => {
    fetch("/api/contracts")
      .then((r) => r.json())
      .then((data: { items: { slug: string; title: string; domain: string; context: string }[] }) => {
        const items = data.items ?? [];
        const map: Record<string, { domain: string; context: string }> = {};
        for (const c of items) {
          map[c.slug] = { domain: c.domain ?? "", context: c.context ?? "" };
        }
        contractMap.current = map;
        setContractOptions(
          items.map((c) => ({
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
    const info = contractMap.current[slug.trim()] ?? { domain: "", context: "" };
    try {
      await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: info.domain,
          context: info.context,
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
    return <p className="mt-2 text-xs font-medium text-green-600">{t("requestSentAdmin")}</p>;
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-dashed border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-700">{t("requestEditorSection")}</p>
      {loadingContracts ? (
        <p className="text-xs text-gray-400">Loading contracts...</p>
      ) : (
        <SearchableSelect
          value={slug}
          onChange={setSlug}
          options={contractOptions}
          placeholder={t("contractSlugPlaceholder")}
        />
      )}
      <textarea
        rows={2}
        placeholder={t("reasonOptional")}
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
        {sending ? t("sending") : t("sendRequest")}
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
  const { t, tWith } = useT();
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[60vh] flex-col rounded-lg bg-white shadow-xl"
        style={{ width: "min(50vw, 600px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {t("policiesForUser")} <span className="font-mono">{userId}</span>
            </h3>
            <p className="text-[11px] text-gray-400">
              {tWith("policyCount", { count: String(policies.length) })}
            </p>
          </div>
          <button onClick={onClose} className="editor-close-button" aria-label="Close" type="button">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : policies.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noPolicies")}</p>
          ) : (
            <>
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
                            {p.user_id ? t("direct") : t("group")}
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
              )}
            </>
          )}
          {showRequest ? <RequestEditorForm onDone={() => setShowRequest(false)} /> : null}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowRequest(!showRequest)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: "var(--ui-primary)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {showRequest ? t("hide") : t("requestEditorAccess")}
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}