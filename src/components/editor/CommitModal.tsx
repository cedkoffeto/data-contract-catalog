"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { DiffView } from "@/src/components/contract/diff/DiffView";
import type { DiffResult } from "@/src/lib/diff";

export function CommitModal({
  defaultMessage,
  contractName,
  diff,
  onConfirm,
  onClose,
}: {
  defaultMessage: string;
  contractName: string;
  diff: DiffResult;
  onConfirm: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [message, setMessage] = useState(defaultMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRefCallback = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    if (node && !node.open) {
      node.showModal();
    }
  }, []);

  function generateMessage() {
    const date = new Intl.DateTimeFormat("fr", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    setMessage(`feat: update ${contractName}

Update data contract ${contractName} - ${date}`);
  }

  function handleClose() {
    if (saving) return;
    dialogRef.current?.close();
  }

  function handleDialogClose() {
    if (saving) return;
    onClose();
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    try {
      await onConfirm(message);
      dialogRef.current?.close();
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
    <dialog ref={dialogRefCallback} className="yaml-sheet yaml-sheet--commit-centered" aria-labelledby={`commit-sheet-title-${id}`} onClose={handleDialogClose}>
      <form method="dialog" className="yaml-sheet__backdrop">
        <button className="yaml-sheet__scrim" aria-label="Close" onClick={handleClose} />
      </form>

      <div className="yaml-sheet__panel yaml-sheet__panel--commit">
          <div className="yaml-sheet__header">
            <div className="yaml-sheet__header-row">
              <div>
                <p className="yaml-sheet__eyebrow">Proposer une modification</p>
                <h3 id={`commit-sheet-title-${id}`}>Proposer la modification</h3>
              </div>
              <div className="yaml-sheet__header-actions">
                <button className="editor-soft-button" disabled={saving} onClick={handleClose} type="button">
                  Cancel
                </button>
                <button className="editor-primary-button" disabled={saving || !message.trim()} onClick={handleConfirm} type="button">
                  {saving ? "Proposing..." : "Proposer"}
                </button>
              </div>
            </div>
            {error ? (
              <div className="commit-modal__error" role="alert">
                <span>{error}</span>
                <button className="commit-modal__error-close" onClick={() => setError(null)} aria-label="Dismiss error" type="button">&times;</button>
              </div>
            ) : null}
          </div>

          <div className="yaml-sheet__body yaml-sheet__body--commit">
          {hasChanges ? (
            <DiffView
              diff={diff}
              fromLabel="Current version"
              toLabel="Your changes"
            />
          ) : (
            <div className="commit-modal__no-diff">No changes detected — the content is identical to the current version.</div>
          )}

          <label className="commit-modal__label" htmlFor={`commit-msg-${id}`}>
            Commit message
            <button className="editor-soft-button" disabled={saving} onClick={generateMessage} type="button" style={{ marginLeft: "0.5rem", fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
              Generate
            </button>
          </label>
          <textarea
            className="commit-modal__textarea"
            id={`commit-msg-${id}`}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your changes..."
            rows={4}
            value={message}
          />
        </div>
      </div>
    </dialog>
  );
}
