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

type AccessRequestPermission = "reader" | "editor";

const ACCESS_REQUEST_PERMISSIONS: AccessRequestPermission[] = ["reader", "editor"];

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
  accessRequestStatus,
}: {
  slug: string;
  domain?: string;
  context?: string;
  accessRequestStatus?: "pending";
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [requestedPermission, setRequestedPermission] = useState<AccessRequestPermission>("reader");
  const [sending, setSending] = useState(false);
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

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    document.body.dataset.raModal = "fading";
    setTimeout(() => setOpen(true), 200);
  }

  function handleClose() {
    setOpen(false);
    setMessage("");
    setRequestedPermission("reader");
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
          dataContract: slug,
          requestedPermission,
          message,
        }),
      });
      setLocalPending(true);
      handleClose();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  const isPending = accessRequestStatus === "pending" || localPending;
  const isMessageValid = message.trim().length >= 3;

  if (isPending) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white shadow-lg"
        style={{ pointerEvents: "auto", backgroundColor: "var(--ui-primary)", opacity: 0.7, cursor: "default" }}
        disabled
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Access requested
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
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
              <div className="flex flex-wrap items-center gap-x-6 text-xs text-gray-400">
                {domain && <span className="flex items-center gap-1">Domain: <span className="catalog-card__badge">{domain}</span></span>}
                {context && <span className="flex items-center gap-1">Context: <span className="catalog-card__badge catalog-card__badge--subtle">{context}</span></span>}
                <span className="flex items-center gap-1">Contract: <span className="catalog-card__badge" style={{ backgroundColor: "#fffbeb", color: "#854d0e" }}>{slug}</span></span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-700">Requested permission</span>
                    <div className="inline-flex rounded-full border p-0.5" style={{ backgroundColor: "rgba(249, 115, 22, 0.08)", borderColor: "rgba(249, 115, 22, 0.22)" }}>
                  {ACCESS_REQUEST_PERMISSIONS.map((permission) => {
                    const selected = requestedPermission === permission;
                    return (
                      <button
                        key={permission}
                        type="button"
                        onClick={() => setRequestedPermission(permission)}
                        className="rounded px-2.5 py-1 text-xs font-bold transition-colors"
                        style={{
                          backgroundColor: selected ? "var(--ui-primary)" : "transparent",
                              color: selected ? "#fff" : "#92400e",
                        }}
                      >
                        {permission}
                      </button>
                    );
                  })}
                </div>
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
