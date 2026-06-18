"use client";

import { useId, useRef, useState } from "react";

export function SubscribeModal({
  slug,
  isSubscribed,
  onSubscribed,
  onUnsubscribed,
  onClose,
}: {
  slug: string;
  isSubscribed: boolean;
  onSubscribed: () => void;
  onUnsubscribed: () => void;
  onClose: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  async function handleSubscribe() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${slug}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        let msg = "Failed to save subscription";
        try {
          const payload = (await res.json()) as { error?: string };
          msg = payload.error ?? msg;
        } catch {
          msg = `Server error (${res.status})`;
        }
        throw new Error(msg);
      }

      dialogRef.current?.close();
      onSubscribed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsubscribe() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${slug}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: null }),
      });

      if (!res.ok) {
        let msg = "Failed to unsubscribe";
        try {
          const payload = (await res.json()) as { error?: string };
          msg = payload.error ?? msg;
        } catch {
          msg = `Server error (${res.status})`;
        }
        throw new Error(msg);
      }

      dialogRef.current?.close();
      onUnsubscribed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="catalog-secondary-link catalog-secondary-link--button"
      >
        {isSubscribed ? "Edit subscription" : "Subscribe"}
      </button>

      <dialog ref={dialogRef} className="yaml-sheet" aria-labelledby={`subscribe-sheet-title-${id}`}>
        <form method="dialog" className="yaml-sheet__backdrop">
          <button className="yaml-sheet__scrim" aria-label="Close" onClick={handleClose} />
        </form>

        <div className="yaml-sheet__panel yaml-sheet__panel--subscribe">
          <div className="yaml-sheet__header">
            <div>
              <p className="yaml-sheet__eyebrow">Notifications</p>
              <h3 id={`subscribe-sheet-title-${id}`}>
                {isSubscribed ? "Edit subscription" : "Subscribe to updates"}
              </h3>
            </div>

            <div className="yaml-sheet__header-actions">
              <button className="editor-soft-button" onClick={handleClose} type="button">
                Cancel
              </button>
              {isSubscribed ? (
                <button className="catalog-secondary-link catalog-secondary-link--button" disabled={saving} onClick={handleUnsubscribe} type="button">
                  Unsubscribe
                </button>
              ) : (
                <button className="catalog-primary-link" disabled={saving} onClick={handleSubscribe} type="button">
                  {saving ? "Subscribing..." : "Subscribe"}
                </button>
              )}
            </div>
          </div>

          <div className="yaml-sheet__body">
            {error ? <p className="contract-side-card__muted" role="alert">{error}</p> : null}

            <p className="text-sm text-gray-500">
              {isSubscribed
                ? "You are subscribed to notifications for this contract."
                : "Subscribe to receive notifications about this contract."}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Your notification channel (in-app, email, or both) is set in your profile preferences.
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
