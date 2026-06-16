"use client";

import { useId, useRef, useState } from "react";

import type { NotificationChannel } from "@/src/lib/subscriptions";

export function SubscribeModal({
  slug,
  currentChannel,
  onSubscribed,
  onUnsubscribed,
  onClose,
}: {
  slug: string;
  currentChannel: NotificationChannel | null;
  onSubscribed: (channel: NotificationChannel) => void;
  onUnsubscribed: () => void;
  onClose: () => void;
}) {
  const id = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [channel, setChannel] = useState<NotificationChannel>(currentChannel ?? "in_app");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${slug}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
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
      onSubscribed(channel);
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
        {currentChannel ? "Edit subscription" : "Subscribe"}
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
                {currentChannel ? "Edit subscription" : "Subscribe to updates"}
              </h3>
            </div>

            <div className="yaml-sheet__header-actions">
              <button className="editor-soft-button" onClick={handleClose} type="button">
                Cancel
              </button>
              {currentChannel ? (
                <button className="catalog-secondary-link catalog-secondary-link--button" disabled={saving} onClick={handleUnsubscribe} type="button">
                  Unsubscribe
                </button>
              ) : null}
              <button className="catalog-primary-link" disabled={saving} onClick={handleSave} type="button">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="yaml-sheet__body">
            {error ? <p className="contract-side-card__muted" role="alert">{error}</p> : null}

            <fieldset className="subscribe-fieldset">
              <legend className="subscribe-legend">Notification channel</legend>

              <label className="subscribe-option">
                <input
                  checked={channel === "in_app"}
                  className="subscribe-option__radio"
                  name={`channel-${id}`}
                  onChange={() => setChannel("in_app")}
                  type="radio"
                  value="in_app"
                />
                <span className="subscribe-option__label">In-app</span>
                <span className="subscribe-option__desc">Notifications within the application</span>
              </label>

              <label className="subscribe-option">
                <input
                  checked={channel === "email"}
                  className="subscribe-option__radio"
                  name={`channel-${id}`}
                  onChange={() => setChannel("email")}
                  type="radio"
                  value="email"
                />
                <span className="subscribe-option__label">Email</span>
                <span className="subscribe-option__desc">Notifications via email</span>
              </label>

              <label className="subscribe-option">
                <input
                  checked={channel === "both"}
                  className="subscribe-option__radio"
                  name={`channel-${id}`}
                  onChange={() => setChannel("both")}
                  type="radio"
                  value="both"
                />
                <span className="subscribe-option__label">In-app &amp; Email</span>
                <span className="subscribe-option__desc">Receive notifications both in-app and via email</span>
              </label>
            </fieldset>
          </div>
        </div>
      </dialog>
    </>
  );
}
