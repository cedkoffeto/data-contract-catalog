"use client";

import { useEffect, useId, useRef, useState } from "react";

export function CommitModal({
  defaultMessage,
  contractName,
  onConfirm,
  onClose,
}: {
  defaultMessage: string;
  contractName: string;
  onConfirm: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState(defaultMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
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

  return (
    <dialog ref={dialogRef} className="yaml-sheet" aria-labelledby={`commit-sheet-title-${id}`}>
      <form method="dialog" className="yaml-sheet__backdrop">
        <button className="yaml-sheet__scrim" aria-label="Close" onClick={handleClose} />
      </form>

      <div className="yaml-sheet__panel yaml-sheet__panel--commit">
        <div className="yaml-sheet__header">
          <div>
            <p className="yaml-sheet__eyebrow">Git commit</p>
            <h3 id={`commit-sheet-title-${id}`}>Submit contract</h3>
          </div>

          <div className="yaml-sheet__header-actions">
            <button className="editor-soft-button" disabled={saving} onClick={handleClose} type="button">
              Cancel
            </button>
            <button className="editor-soft-button" disabled={saving} onClick={generateMessage} type="button">
              Generate
            </button>
            <button className="editor-primary-button" disabled={saving || !message.trim()} onClick={handleConfirm} type="button">
              {saving ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>

        <div className="yaml-sheet__body">
          {error ? <p className="commit-modal__error" role="alert">{error}</p> : null}

          <label className="commit-modal__label" htmlFor={`commit-msg-${id}`}>
            Commit message
          </label>
          <textarea
            className="commit-modal__textarea"
            id={`commit-msg-${id}`}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your changes..."
            rows={6}
            value={message}
          />
        </div>
      </div>
    </dialog>
  );
}
