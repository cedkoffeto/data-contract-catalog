"use client";

import { useId, useRef, useState } from "react";

import { t } from "@/src/lib/i18n";

export function YamlDialogButton({ yamlRaw }: { yamlRaw: string }) {
  const id = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(yamlRaw);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="catalog-secondary-link catalog-secondary-link--button"
      >
        <svg className="h-5 w-5" viewBox="-0.5 -0.5 24 24" aria-hidden="true">
          <path d="m4.3125 8.145833333333334 9.104166666666668 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="m4.3125 11.020833333333334 9.104166666666668 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="m4.3125 5.270833333333334 6.708333333333334 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="m4.3125 13.895833333333334 7.1875 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="m4.3125 16.770833333333336 3.8333333333333335 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="M8.145833333333334 22.520833333333336h-6.708333333333334a0.9583333333333334 0.9583333333333334 0 0 1 -0.9583333333333334 -0.9583333333333334v-20.125a0.9583333333333334 0.9583333333333334 0 0 1 0.9583333333333334 -0.9583333333333334h12.739125a0.9583333333333334 0.9583333333333334 0 0 1 0.6775416666666667 0.28079166666666666L18.406708333333334 4.3125a0.9583333333333334 0.9583333333333334 0 0 1 0.28079166666666666 0.6775416666666667V8.145833333333334" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="m15.045833333333333 21.370833333333334 -4.025 1.15 1.15 -4.025 6.879875 -6.879875a2.032625 2.032625 0 0 1 2.875 2.875Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="m18.188208333333332 12.478458333333334 2.875 2.875" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
          <path d="m12.170833333333333 18.495833333333334 2.875 2.875" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
        </svg>
        View YAML
      </button>

      <dialog ref={dialogRef} id={`dialog-datacontract-yaml-${id}`} className="yaml-sheet" aria-labelledby={`yaml-sheet-title-${id}`} aria-modal="true">
        <form method="dialog" className="yaml-sheet__backdrop">
          <button className="yaml-sheet__scrim" aria-label="Close YAML preview" />
        </form>

        <div className="yaml-sheet__panel">
          <div className="yaml-sheet__header">
            <div>
              <p className="yaml-sheet__eyebrow">{t("contractSource")}</p>
              <h3 id={`yaml-sheet-title-${id}`}>{t("yamlPreview")}</h3>
            </div>

            <div className="yaml-sheet__header-actions">
              <button className="editor-soft-button" onClick={handleCopy} type="button">
                {copyState === "copied" ? t("copied") : copyState === "error" ? t("copyFailed") : t("copy")}
              </button>
              <button className="editor-soft-button" onClick={() => dialogRef.current?.close()} type="button">
                Close
              </button>
            </div>
          </div>

          <div className="yaml-sheet__body">
            <pre className="yaml-sheet__code">
              <code>{yamlRaw}</code>
            </pre>
          </div>
        </div>
      </dialog>
    </>
  );
}
