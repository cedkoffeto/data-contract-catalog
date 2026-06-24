"use client";

import { useEffect, useId, useState } from "react";

import { DiffView } from "@/src/components/contract/diff/DiffView";
import type { DiffResult } from "@/src/lib/diff";

export function CommitModal({
  defaultMessage,
  contractSlug,
  contractName,
  domain,
  context,
  userId,
  diff,
  onConfirm,
  onClose,
}: {
  defaultMessage: string;
  contractSlug: string;
  contractName: string;
  domain: string;
  context: string;
  userId: string;
  diff: DiffResult;
  onConfirm: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generateMessage() {
    const date = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");

    const added = diff.structural.filter((c) => c.type === "added").length;
    const removed = diff.structural.filter((c) => c.type === "removed").length;
    const modified = diff.structural.filter((c) => c.type === "modified").length;
    const total = added + removed + modified;
    const counts = `${total} field${total > 1 ? "s" : ""} modified by user ${userId} in domain:${domain} / context:${context} / contrat:${contractSlug} - ${date}`;

    const lines: string[] = [
      `feat(${contractSlug}): update ${contractName}`,
      "",
      counts,
    ];

    if (diff.structural.length > 0) {
      lines.push("");
      for (const change of diff.structural) {
        const icon = change.type === "added" ? "+" : change.type === "removed" ? "-" : "~";
        lines.push(`${icon} ${change.path}`);
      }
    }

    setMessage(lines.join("\n"));
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    try {
      await onConfirm(message);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = diff.unified.some((c) => c.type !== "unchanged");

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 15000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={handleClose}
    >
      <div
        className="flex max-h-[80vh] flex-col rounded-lg bg-white shadow-xl"
        style={{ width: "min(60vw, 800px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Soumettre la modification</h3>
            <p className="text-[11px] text-gray-400">{contractName}</p>
          </div>
          <button
            onClick={handleClose}
            className="editor-close-button"
            aria-label="Close"
            title="Close"
            type="button"
            disabled={saving}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600" type="button">&times;</button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {hasChanges ? (
            <DiffView
              diff={diff}
              fromLabel="Current version"
              toLabel="Your changes"
            />
          ) : (
            <div className="py-6 text-center text-sm text-gray-400">No changes detected — the content is identical to the current version.</div>
          )}

          <label className="mb-1 mt-3 flex items-center gap-2 text-xs font-medium text-gray-700" htmlFor={`commit-msg-${id}`}>
            Commit message
            <button className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100" disabled={saving} onClick={generateMessage} type="button">
              <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" aria-hidden="true">
                <path d="M8 1l1.5 3.5L13 6 9.5 7.5 8 11 6.5 7.5 3 6l3.5-1.5L8 1z"/>
              </svg>
              Generate
            </button>
          </label>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm text-gray-900 outline-none"
            style={{ borderColor: "#d1d5db" }}
            id={`commit-msg-${id}`}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your changes..."
            rows={4}
            value={message}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2">
          <button
            onClick={handleClose}
            disabled={saving}
            className="rounded px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || message.trim().length < 3}
            className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--ui-primary)" }}
          >
            {saving ? "Soumission..." : "Soumettre"}
          </button>
        </div>
      </div>
    </div>
  );
}
