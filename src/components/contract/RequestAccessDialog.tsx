"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function UnlockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

export function RequestAccessDialog({
  slug,
  domain,
  context,
}: {
  slug?: string;
  domain?: string;
  context?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [localPending, setLocalPending] = useState(false);

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
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleOpen() {
    document.body.dataset.raModal = "fading";
    setTimeout(() => setOpen(true), 200);
  }

  function handleClose() {
    setOpen(false);
    setDone(false);
    setMessage("");
  }

  async function handleSubmit() {
    setSending(true);
    try {
      await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain || "",
          context: context || "",
          dataContract: slug || "",
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

  const isPending = localPending;
  const isMessageValid = message.trim().length >= 3;

  return (
    <>
      {isPending ? (
        <button
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold text-white shadow-lg"
          style={{ pointerEvents: "auto", backgroundColor: "var(--ui-primary)", opacity: 0.7, cursor: "default" }}
          disabled
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Access requested
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="rounded-md px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: "var(--ui-primary)" }}
        >
          Request access
        </button>
      )}

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

            {done ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
                <p className="text-sm font-medium text-green-600">Request sent to administrators.</p>
                <button
                  type="button"
                  onClick={() => { setLocalPending(true); handleClose(); }}
                  className="mt-3 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-6 text-xs text-gray-400">
                    {domain && <span className="flex items-center gap-1">Domain: <span className="catalog-card__badge">{domain}</span></span>}
                    {context && <span className="flex items-center gap-1">Context: <span className="catalog-card__badge catalog-card__badge--subtle">{context}</span></span>}
                    {slug && <span className="flex items-center gap-1">Contract: <span className="catalog-card__badge" style={{ backgroundColor: "#fffbeb", color: "#854d0e" }}>{slug}</span></span>}
                  </div>

                  <textarea
                    className="mt-3 w-full rounded-md border px-3 py-2 text-sm text-gray-900"
                    rows={3}
                    placeholder="Why do you need access? (min. 3 characters)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ borderColor: "#e5e7eb" }}
                  />
                  {message.trim() && !isMessageValid && (
                    <p className="mt-1 text-xs text-red-500">Minimum 3 characters required</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2">
                  <button
                    onClick={handleSubmit}
                    disabled={sending || !isMessageValid}
                    className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: "var(--ui-primary)" }}
                  >
                    {sending ? "Sending\u2026" : "Send request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
