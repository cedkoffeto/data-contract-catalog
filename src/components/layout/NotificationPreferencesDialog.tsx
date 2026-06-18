"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { NotificationChannel } from "@/src/lib/subscriptions";

export function NotificationPreferencesDialog({ onClose }: { onClose: () => void }) {
  const id = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [channel, setChannel] = useState<NotificationChannel>("in_app");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();

    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.preference?.notification_channel) {
          setChannel(data.preference.notification_channel);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationChannel: channel }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          dialogRef.current?.close();
          onClose();
        }, 1000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog ref={dialogRef} className="yaml-sheet" aria-labelledby={`notif-prefs-title-${id}`}>
      <form method="dialog" className="yaml-sheet__backdrop">
        <button className="yaml-sheet__scrim" aria-label="Close" onClick={handleClose} />
      </form>

      <div className="yaml-sheet__panel">
        <div className="yaml-sheet__header">
          <div>
            <p className="yaml-sheet__eyebrow">Settings</p>
            <h3 id={`notif-prefs-title-${id}`}>Notification preferences</h3>
          </div>

          <div className="yaml-sheet__header-actions">
            <button className="editor-soft-button" onClick={handleClose} type="button">
              Cancel
            </button>
            <button className="catalog-primary-link" disabled={saving || loading} onClick={handleSave} type="button">
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>

        <div className="yaml-sheet__body">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <fieldset className="subscribe-fieldset">
              <legend className="subscribe-legend">Default notification channel</legend>
              <p className="mb-3 text-xs text-gray-400">
                This channel will be used for all your subscriptions.
              </p>

              <label className="subscribe-option">
                <input
                  checked={channel === "in_app"}
                  className="subscribe-option__radio"
                  name={`notif-channel-${id}`}
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
                  name={`notif-channel-${id}`}
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
                  name={`notif-channel-${id}`}
                  onChange={() => setChannel("both")}
                  type="radio"
                  value="both"
                />
                <span className="subscribe-option__label">In-app &amp; Email</span>
                <span className="subscribe-option__desc">Receive notifications both in-app and via email</span>
              </label>
            </fieldset>
          )}
        </div>
      </div>
    </dialog>
  );
}
