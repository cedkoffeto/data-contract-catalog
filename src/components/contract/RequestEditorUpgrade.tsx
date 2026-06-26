"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/src/lib/use-i18n";

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function RequestEditorUpgrade({
  slug,
  domain,
  context,
  compact,
}: {
  slug: string;
  domain?: string;
  context?: string;
  compact?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/access-requests/my?contractSlug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { status?: string | null } | null) => {
        if (data?.status === "pending") {
          setDone(true);
          setRequestStatus("pending");
        } else if (data?.status === "rejected") {
          setRequestStatus("rejected");
        }
      })
      .catch(() => {});
  }, [slug]);

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
          requestedPermission: "editor",
          message,
        }),
      });
      setDone(true);
      setRequestStatus("pending");
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  function handleCompactClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (requestStatus === "rejected") {
      setDone(false);
      setRequestStatus(null);
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCompactClick}
        className={compact
          ? done
            ? "flex items-center gap-1 text-xs font-semibold text-gray-400 cursor-not-allowed"
            : "flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-800"
          : "catalog-secondary-link catalog-secondary-link--button"
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
        </svg>
        {compact ? (done ? t("requestSentAdmin") : t("requestEditor")) : t("requestEditorAccess")}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => { setOpen(false); setMessage(""); }}
        >
          <div
            className="flex max-h-[60vh] flex-col rounded-lg bg-white shadow-xl"
            style={{ width: "min(50vw, 600px)", resize: "both", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-900">{t("requestEditorTitle")}</h3>
              </div>
              <button className="editor-close-button" onClick={() => { setOpen(false); setMessage(""); }} aria-label={t("close")}>
                <CloseIcon />
              </button>
            </div>

            {done ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
                <p className="text-sm font-medium text-green-600">{t("requestSentAdmin")}</p>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setMessage(""); }}
                  className="mt-3 rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
{t("close")}
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <p className="text-sm text-gray-700">
                    {t("alreadyReader")}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 text-xs text-gray-400">
                    {domain && <span className="flex items-center gap-1">{t("domainLabel")} <span className="catalog-card__badge">{domain}</span></span>}
                    {context && <span className="flex items-center gap-1">{t("contextLabel")} <span className="catalog-card__badge catalog-card__badge--subtle">{context}</span></span>}
                    <span className="flex items-center gap-1">{t("contractLabel")} <span className="catalog-card__badge" style={{ backgroundColor: "#fffbeb", color: "#854d0e" }}>{slug}</span></span>
                  </div>

                  <textarea
                    className="mt-3 w-full rounded-md border px-3 py-2 text-sm text-gray-900"
                    rows={3}
                    placeholder={t("whyEditorPlaceholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ borderColor: "#e5e7eb" }}
                  />
                  {message.trim() && message.trim().length < 3 && (
                    <p className="mt-1 text-xs text-red-500">{t("minCharsRequired")}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2">
                  <button
                    onClick={handleSubmit}
                    disabled={sending || message.trim().length < 3}
                    className="rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: "var(--ui-primary)" }}
                  >
                    {sending ? t("sending") : t("sendRequest")}
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
