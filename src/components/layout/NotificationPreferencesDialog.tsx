"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { t } from "@/src/lib/i18n";

import type { NotificationChannel } from "@/src/lib/subscriptions";

export function NotificationPreferencesDialog({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [channel, setChannel] = useState<NotificationChannel>("in_app");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);

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
        setTimeout(onClose, 1000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">{t("settingsEyebrow")}</h3>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-gray-400">{t("loading")}</p>
          ) : (
            <fieldset>
              <legend className="mb-1 text-xs font-semibold text-gray-700">{t("defaultChannel")}</legend>
              <p className="mb-3 text-xs text-gray-400">
                {t("channelDescription")}
              </p>

              <label className="mb-2 flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-gray-50">
                <input
                  checked={channel === "in_app"}
                  className="mt-0.5"
                  name="notif-channel"
                  onChange={() => setChannel("in_app")}
                  type="radio"
                  value="in_app"
                />
                <div>
                  <span className="font-medium text-gray-900">{t("channelInApp")}</span>
                  <p className="text-xs text-gray-400">{t("channelInAppDesc")}</p>
                </div>
              </label>

              <label className="mb-2 flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-gray-50">
                <input
                  checked={channel === "email"}
                  className="mt-0.5"
                  name="notif-channel"
                  onChange={() => setChannel("email")}
                  type="radio"
                  value="email"
                />
                <div>
                  <span className="font-medium text-gray-900">{t("channelEmail")}</span>
                  <p className="text-xs text-gray-400">{t("channelEmailDesc")}</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-gray-50">
                <input
                  checked={channel === "both"}
                  className="mt-0.5"
                  name="notif-channel"
                  onChange={() => setChannel("both")}
                  type="radio"
                  value="both"
                />
                <div>
                  <span className="font-medium text-gray-900">{t("channelBoth")}</span>
                  <p className="text-xs text-gray-400">{t("channelBothDesc")}</p>
                </div>
              </label>
            </fieldset>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            type="button"
          >
            {t("cancel")}
          </button>
          <button
            className="catalog-primary-link"
            disabled={saving || loading}
            onClick={handleSave}
            type="button"
          >
            {saving ? t("saving") : saved ? t("saved") : t("save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
