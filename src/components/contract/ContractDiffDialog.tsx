"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";

import yaml from "js-yaml";

import { useT } from "@/src/lib/use-i18n";

import { computeDiff } from "@/src/lib/diff";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { DiffView } from "@/src/components/contract/diff/DiffView";
import type { ContractHistoryEntry, DataContract } from "@/src/lib/types";

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

const contentCache = new Map<string, { content: string; ts: number }>();

async function fetchContent(slug: string, ref: string): Promise<string | null> {
  const cacheKey = `${slug}:${ref}`;
  const cached = contentCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 30_000) {
    return cached.content;
  }

  const response = await fetch(`/api/contracts/${slug}/repository-content?ref=${encodeURIComponent(ref)}`, {
    cache: "no-store"
  });
  const data = await response.json() as { content?: string; error?: string; notFoundAtRef?: boolean };

  if (data.notFoundAtRef) {
    return null;
  }

  if (!response.ok || !data.content) {
    throw new Error(data.error ?? "Unable to load contract version");
  }

  contentCache.set(cacheKey, { content: data.content, ts: Date.now() });
  return data.content;
}

export function ContractDiffDialog({
  slug,
  currentYamlRaw,
  currentData,
  historyEntries,
  onClose
}: {
  slug: string;
  currentYamlRaw: string;
  currentData: DataContract;
  historyEntries: ContractHistoryEntry[];
  onClose: () => void;
}) {
  const { t, tWith } = useT();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const id = useId().replace(/:/g, "");

  const [fromRef, setFromRef] = useState("");
  const [toRef, setToRef] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<ReturnType<typeof computeDiff> | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const dialogRefCallback = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    if (node && isOpen && !node.open) {
      node.showModal();
    }
  }, [isOpen]);

  function open() {
    setIsOpen(true);
    setDiffResult(null);
    setError(null);
    setToRef("latest");
    setFromRef(historyEntries[0]?.id ?? "");
  }

  function handleClose() {
    if (loading) return;
    setIsOpen(false);
    dialogRef.current?.close();
  }

  function handleDialogClose() {
    if (loading) return;
    setIsOpen(false);
    onClose();
  }

  async function handleCompare(event: React.FormEvent) {
    event.preventDefault();
    if (!fromRef) return;

    setLoading(true);
    setError(null);
    setDiffResult(null);

    try {
      const fromContent = await fetchContent(slug, fromRef);
      if (fromContent === null) {
        setError(tWith("contractNotExistAtRef", { ref: fromEntry?.shortId ?? fromRef }));
        return;
      }

      const toContent = toRef === "latest" ? currentYamlRaw : await fetchContent(slug, toRef);
      if (toContent === null) {
        setError(tWith("contractNotExistAtRef", { ref: toEntry?.shortId ?? toRef }));
        return;
      }

      let fromData: Record<string, unknown> | null;
      let toData: Record<string, unknown> | null;

      try {
        fromData = yaml.load(fromContent) as Record<string, unknown> | null;
      } catch {
        setError(t("invalidYamlAtRef"));
        return;
      }

      if (toRef === "latest") {
        toData = currentData as unknown as Record<string, unknown>;
      } else {
        try {
          toData = yaml.load(toContent) as Record<string, unknown> | null;
        } catch {
          setError(t("invalidYamlAtRef"));
          return;
        }
      }

      const diff = computeDiff(
        fromContent,
        toContent,
        fromData ?? {},
        toData ?? {}
      );

      setDiffResult(diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute diff");
    } finally {
      setLoading(false);
    }
  }

  const fromEntry = historyEntries.find((e) => e.id === fromRef);
  const toEntry = toRef === "latest" ? null : historyEntries.find((e) => e.id === toRef);

  const historyOptions = useMemo(
    () =>
      historyEntries.map((entry) => ({
        value: entry.id,
        label: `${entry.shortId} — ${entry.title}`,
        extra: `${formatDate(entry.authoredDate)} · ${entry.authorName}`
      })),
    [historyEntries]
  );

  return (
    <>
      <button className="contract-side-card__link" onClick={open} type="button">
        {t("compareVersions")}
      </button>

      <dialog ref={dialogRefCallback} className="yaml-sheet yaml-sheet--diff-centered" aria-labelledby={`diff-sheet-title-${id}`} onClose={handleDialogClose}>
        <form method="dialog" className="yaml-sheet__backdrop">
          <button className="yaml-sheet__scrim" aria-label="Close diff panel" onClick={handleClose} />
        </form>

        <div className="yaml-sheet__panel yaml-sheet__panel--diff-centered">
          <div className="yaml-sheet__header">
            <div className="yaml-sheet__header-row">
              <div>
                <p className="yaml-sheet__eyebrow">{t("versionComparison")}</p>
                <h3 id={`diff-sheet-title-${id}`}>{t("compareTitle")}</h3>
              </div>
              <div className="yaml-sheet__header-actions">
                <button className="editor-close-button" disabled={loading} onClick={handleClose} aria-label={t("close")} title={t("close")} type="button">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="yaml-sheet__body yaml-sheet__body--diff">
            <form className="diff-picker" onSubmit={handleCompare}>
              <div className="diff-picker__fields">
                <div className="diff-picker__field">
                  <label className="diff-picker__label">{t("fromLabel")}</label>
                  <SearchableSelect
                    value={fromRef}
                    onChange={setFromRef}
                    options={historyOptions}
                    placeholder={t("selectVersion")}
                    emptyLabel={t("noHistory")}
                    disabled={loading}
                  />
                </div>

                <div className="diff-picker__field">
                  <label className="diff-picker__label">{t("toLabel")}</label>
                  <SearchableSelect
                    value={toRef}
                    onChange={setToRef}
                    options={historyOptions}
                    placeholder={t("selectVersion")}
                    disabled={loading}
                    includeLatest
                  />
                </div>

                <button
                  className="diff-picker__submit"
                  disabled={!fromRef || loading}
                  type="submit"
                >
                  {loading ? t("computing") : t("compare")}
                </button>
              </div>
            </form>

            {error ? <p className="diff-picker__error">{error}</p> : null}

            {diffResult ? (
              <div className="diff-picker__result">
                <DiffView
                  diff={diffResult}
                  fromLabel={fromEntry ? `${fromEntry.shortId} — ${fromEntry.title}` : fromRef}
                  toLabel={toEntry ? `${toEntry.shortId} — ${toEntry.title}` : t("currentMain")}
                />
              </div>
            ) : !loading ? (
              <div className="diff-picker__placeholder">
                {t("diffPlaceholder")}
              </div>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
