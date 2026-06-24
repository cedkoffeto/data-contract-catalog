"use client";

import { useState } from "react";

export function SubscribeButton({
  slug,
  isSubscribed,
  onSubscribed,
  onUnsubscribed,
}: {
  slug: string;
  isSubscribed: boolean;
  onSubscribed: () => void;
  onUnsubscribed: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    setSaving(true);
    try {
      const res = await fetch(`/api/contracts/${slug}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: isSubscribed ? JSON.stringify({ channel: null }) : JSON.stringify({}),
      });
      if (!res.ok) return;
      if (isSubscribed) onUnsubscribed(); else onSubscribed();
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      disabled={saving}
      onClick={handleToggle}
      className={`catalog-secondary-link catalog-secondary-link--button ${isSubscribed ? "text-orange-700" : ""}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={isSubscribed ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {isSubscribed ? "Unsubscribe" : "Subscribe"}
    </button>
  );
}
