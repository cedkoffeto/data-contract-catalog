"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function UnlockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function RequestAccessButton({
  slug,
  domain,
  context,
}: {
  slug: string;
  domain?: string;
  context?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.dataset.raModal = "open";
    } else {
      delete document.body.dataset.raModal;
    }
    return () => { delete document.body.dataset.raModal; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function handleSubmit() {
    setSending(true);
    try {
      await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain || "",
          context: context || "",
          dataContract: slug,
          message,
        }),
      });
      setDone(true);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setDone(false);
    setMessage("");
  }

  if (done) {
    return (
      <span className="text-xs text-green-600 font-medium" style={{ pointerEvents: "auto" }}>
        Request sent
      </span>
    );
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
        style={{ pointerEvents: "auto", backgroundColor: "var(--ui-primary)" }}
      >
        <UnlockIcon /> Request access
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={handleClose}
        >
          <div
            className="flex max-h-[60vh] flex-col rounded-lg bg-white shadow-xl"
            style={{ width: "min(50vw, 600px)", resize: "both", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <div className="flex items-center gap-2">
                <UnlockIcon />
                <h3 className="text-sm font-semibold text-gray-900">Request access</h3>
              </div>
              <button className="editor-close-button" onClick={handleClose} aria-label="Close">
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-1 text-xs text-gray-400">
                {domain && <span className="block">Domain: {domain}</span>}
                {context && <span className="block">Context: {context}</span>}
                <span className="block">Contract: {slug}</span>
              </div>

              <textarea
                className="mt-3 w-full rounded-md border px-3 py-2 text-sm text-gray-900"
                rows={3}
                placeholder="Why do you need access? (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ borderColor: "#d1d5db" }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2">
              <button
                onClick={handleClose}
                className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending}
                className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                {sending ? "Sending\u2026" : "Send request"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
