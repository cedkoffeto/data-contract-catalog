"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import dynamic from "next/dynamic";
import yaml from "js-yaml";

import { useT } from "@/src/lib/use-i18n";
import { useToast } from "@/src/components/ui/ToastProvider";
import { ContractBody } from "@/src/components/contract/ContractBody";
import { DiscussionThread } from "@/src/components/contract/DiscussionThread";
import { ContractHeader } from "@/src/components/contract/ContractHeader";
import { RequestEditorUpgrade } from "@/src/components/contract/RequestEditorUpgrade";
import { SubscribeButton } from "@/src/components/contract/SubscribeModal";
import { YamlDialogButton } from "@/src/components/contract/YamlDialogButton";
import type { ContractComment, ContractHistoryEntry, DataContract } from "@/src/lib/types";
import type { Subscription } from "@/src/lib/subscriptions";

function ExportButton({ slug }: { slug: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"pdf" | "yaml" | "csv">("csv");

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const FORMATS = ["pdf", "yaml", "csv"] as const;

  function handleValidate() {
    const url = `/api/contracts/${encodeURIComponent(slug)}/export?type=${format}`;
    if (format === "pdf") {
      window.open(url, "_blank", "noreferrer");
    } else {
      window.location.href = url;
    }
    setOpen(false);
  }

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="catalog-secondary-link catalog-secondary-link--button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {t("exportCsv")}
      </button>
      {open ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Format d'export</h3>
            <div className="mt-4 inline-flex w-full rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {FORMATS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className="flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: format === fmt ? "var(--ui-primary)" : "transparent",
                    color: format === fmt ? "#fff" : "#374151",
                  }}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleValidate}
                className="rounded-md px-4 py-1.5 text-xs font-bold text-white transition-colors"
                style={{ backgroundColor: "var(--ui-primary)" }}
              >
                Télécharger
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

const ContractDiffDialog = dynamic(
  () => import("@/src/components/contract/ContractDiffDialog").then((m) => m.ContractDiffDialog),
  { ssr: false },
);

function formatHistoryMeta(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function ContractPageClient({
  data,
  slug,
  yamlRaw,
  historyEntries,
  userId,
  canRead,
  canEdit,
  canAdmin,
  initialCommentCount = 0,
  initialIssueCount = 0,
  initialSubscribed,
  initialIsFavorite,
}: {
  data: DataContract;
  slug: string;
  yamlRaw: string;
  historyEntries: ContractHistoryEntry[];
  userId?: string;
  canRead: boolean;
  canEdit: boolean;
  canAdmin: boolean;
  initialCommentCount?: number;
  initialIssueCount?: number;
  initialSubscribed?: boolean;
  initialIsFavorite?: boolean;
}) {
  const { t, tWith } = useT();
  const { showToast } = useToast();
  const [activeVersion, setActiveVersion] = useState<{
    entry: ContractHistoryEntry;
    data: DataContract;
    yamlRaw: string;
  } | null>(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyDialogRef = useRef<HTMLDialogElement>(null);
  const historyDialogId = useId().replace(/:/g, "");

  const [subscribed, setSubscribed] = useState(initialSubscribed ?? false);
  const [loadingSubscription, setLoadingSubscription] = useState(initialSubscribed === undefined);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [issueCount, setIssueCount] = useState(initialIssueCount);
  const [fieldAnnotations, setFieldAnnotations] = useState<Record<string, number>>({});
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite ?? false);
  const [activeTab, setActiveTab] = useState<"details" | "discussion">("details");

  useEffect(() => {
    if (window.location.hash.startsWith("#comment-")) {
      setActiveTab("discussion");
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoadingSubscription(false);
      return;
    }

    if (initialSubscribed !== undefined) {
      setLoadingSubscription(false);
      return;
    }

    fetch(`/api/contracts/${slug}/subscription`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subscription?: Subscription | null } | null) => {
        setSubscribed(data?.subscription !== null && data?.subscription !== undefined);
      })
      .catch(() => setSubscribed(false))
      .finally(() => setLoadingSubscription(false));
  }, [slug, userId, initialSubscribed]);

  useEffect(() => {
    if (!userId) return;
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail as { slug: string; subscribed: boolean };
      if (detail.slug === slug) setSubscribed(detail.subscribed);
    }
    window.addEventListener("subscription-changed", onChange);
    return () => window.removeEventListener("subscription-changed", onChange);
  }, [slug, userId]);

  useEffect(() => {
    if (!userId) return;
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail as { slug: string; isFavorite: boolean };
      if (detail.slug === slug) setIsFavorite(detail.isFavorite);
    }
    window.addEventListener("favorite-changed", onChange);
    return () => window.removeEventListener("favorite-changed", onChange);
  }, [slug, userId]);

  useEffect(() => {
    if (!userId) return;
    if (initialIsFavorite !== undefined) return;
    fetch(`/api/contracts/${encodeURIComponent(slug)}/preferences`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { preferences?: { isFavorite?: boolean } } | null) => {
        setIsFavorite(Boolean(data?.preferences?.isFavorite));
      })
      .catch(() => {
        setIsFavorite(false);
      });
  }, [slug, userId, initialIsFavorite]);

  const loadFieldAnnotations = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/discussion-data`);
      if (!res.ok) return;
      const data = await res.json() as { comments: ContractComment[] };
      const counts: Record<string, number> = {};
      for (const c of data.comments) {
        for (const field of c.targetFields ?? []) {
          counts[field] = (counts[field] ?? 0) + 1;
        }
      }
      setFieldAnnotations(counts);
      setCommentCount(data.comments.length);
    } catch {}
  }, [slug]);

  useEffect(() => {
    loadFieldAnnotations();
  }, [loadFieldAnnotations]);

  function handleFieldClick(fieldName: string) {
    setActiveTab("discussion");
  }

  const displayedData = activeVersion?.data ?? data;
  const displayedYamlRaw = activeVersion?.yamlRaw ?? yamlRaw;
  const asset = displayedData.asset ?? {};
  const qualityChecks = displayedData.quality?.checks?.length ?? 0;
  const fields = displayedData.contract?.schema?.fields?.length ?? 0;
  const sources = displayedData.inputs?.sources?.length ?? 0;

  const historyItems = useMemo(() => historyEntries.slice(0, 6), [historyEntries]);

  async function handleOpenHistory(entry: ContractHistoryEntry) {
    setLoadingHistoryId(entry.id);
    setHistoryError(null);

    try {
      const response = await fetch(`/api/contracts/${slug}/repository-content?ref=${encodeURIComponent(entry.id)}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as { content?: string; error?: string };

      if (!response.ok || !payload.content) {
        throw new Error(payload.error || "Unable to load contract version");
      }

      const parsed = ((yaml.load(payload.content) as DataContract | undefined) ?? {}) as DataContract;
      setActiveVersion({
        entry,
        data: parsed,
        yamlRaw: payload.content
      });
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to load contract version");
    } finally {
      setLoadingHistoryId(null);
    }
  }

  async function handleToggleFavorite() {
    const next = !isFavorite;
    const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
    if (!res.ok) { showToast("Erreur lors de la mise en favori", "error"); return; }
    const result = (await res.json()) as { preferences?: { isFavorite?: boolean } };
    setIsFavorite(Boolean(result?.preferences?.isFavorite));
    window.dispatchEvent(new CustomEvent("favorite-changed", { detail: { slug, isFavorite: Boolean(result?.preferences?.isFavorite) } }));
    showToast("Favori mis à jour");
  }

  function TabIcon({ name }: { name: "details" | "discussion" }) {
    if (name === "discussion") {
      return (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h6.75M21 12c0 4.142-3.582 7.5-8 7.5a8.8 8.8 0 0 1-2.25-.29L6 20.25l.9-3.15A7.05 7.05 0 0 1 5 12c0-4.142 3.582-7.5 8-7.5s8 3.358 8 7.5Z" />
        </svg>
      );
    }

    return (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.575 16.5 9v6L7.5 19.425a1.5 1.5 0 0 1-2.121-1.421V6a1.5 1.5 0 0 1 2.121-1.425ZM16.5 9 7.5 4.575" />
      </svg>
    );
  }

  function ContractTab({ id, label, count, icon }: { id: "details" | "discussion"; label: string; count?: number; icon: "details" | "discussion" }) {
    const isActive = activeTab === id;
    const isFirst = id === "details";
    const isLast = id === "discussion";
    const clipPath = isFirst
      ? "polygon(0 0, 92% 0, 100% 100%, 0 100%)"
      : isLast
        ? "polygon(8% 0, 100% 0, 100% 100%, 0 100%)"
        : "polygon(8% 0, 100% 0, 92% 100%, 0 100%)";
    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => setActiveTab(id)}
        className={`group relative flex min-w-max items-center gap-2 px-6 text-sm font-bold transition hover:-translate-y-px focus:outline-none ${isFirst ? "ml-0" : "-ml-px"} ${isActive ? "z-20" : "z-10"}`}
        style={{
          clipPath,
          backgroundColor: isActive ? "#f97316" : "#f8fafc",
          color: isActive ? "#ffffff" : "#64748b",
          boxShadow: isActive ? "0 8px 18px rgba(249, 115, 22, 0.22)" : "0 1px 2px rgba(15, 23, 42, 0.06)",
          paddingTop: "10.1px",
          paddingBottom: "10.1px",
        }}
      >
        <span className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}>
          <TabIcon name={icon} />
        </span>
        {label}
        {count !== undefined ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${isActive ? "text-orange-700" : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"}`}
            style={isActive ? { backgroundColor: "#ffffff" } : undefined}
          >
            {count}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <main className="contract-page">
      <div className="contract-page__inner">
        <div className="contract-layout-shell">
          <div className="contract-main-column">
            {activeVersion ? (
              <div className="contract-version-banner">
                <div className="contract-version-banner__copy">
                  <span className="contract-version-banner__tag">{tWith("versionBanner", { shortId: activeVersion.entry.shortId })}</span>
                  <strong>{activeVersion.entry.title}</strong>
                </div>
                <button className="editor-soft-button editor-soft-button--compact" onClick={() => setActiveVersion(null)} type="button">
                  {t("backToCurrent")}
                </button>
              </div>
            ) : null}

            <ContractHeader asset={asset} showActions={false} />

            <section className="contract-summary-strip">
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">{t("schemaFields")}</span>
                <strong>{fields}</strong>
              </article>
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">{t("inputSources")}</span>
                <strong>{sources}</strong>
              </article>
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">{t("qualityChecks")}</span>
                <strong>{qualityChecks}</strong>
              </article>
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">{t("lifecycle")}</span>
                <strong>{asset.status ?? t("draft")}</strong>
              </article>
            </section>

            <div className="contract-content-shell">
              <div className="contract-content-shell__main">
                <div className="sticky top-0 z-10 mb-4 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
                  <div role="tablist" aria-label="Contract sections" className="flex overflow-x-auto">
                    <ContractTab id="details" label={t("tabDetails")} icon="details" />
                    <ContractTab id="discussion" label={t("tabDiscussion")} count={commentCount + issueCount} icon="discussion" />
                  </div>
                </div>
                <div className={activeTab === "details" ? "" : "hidden"}>
                  <ContractBody data={displayedData} slug={slug} userId={userId} fieldAnnotations={fieldAnnotations} onFieldClick={handleFieldClick} onAnnotationPosted={loadFieldAnnotations} />
                </div>
                <div className={activeTab === "discussion" ? "" : "hidden"}>
                  <DiscussionThread slug={slug} userId={userId} canAdmin={canAdmin} onCommentCountChange={setCommentCount} onIssueCountChange={setIssueCount} fields={displayedData.contract?.schema?.fields} />
                </div>
              </div>
            </div>
          </div>

          <aside className="contract-side-panel">
            <div className="contract-side-card contract-side-card--actions">
              <h2>{t("workspace")}</h2>
              <p>{t("workspaceDesc")}</p>
              <div className="contract-side-card__actions">
                {canEdit ? (
                  <a className="catalog-primary-link w-full justify-center" href={`/editor?contract=${encodeURIComponent(slug)}`}>
                    {t("openEditor")}
                  </a>
                ) : (
                  <>
                    <button
                      className="catalog-primary-link catalog-primary-link--disabled w-full justify-center"
                      disabled
                      title={t("noEditPermission")}
                      type="button"
                    >
                      {t("openEditor")}
                    </button>
                    {userId && canRead ? <RequestEditorUpgrade slug={slug} domain={asset?.domain} context={asset?.context} /> : null}
                  </>
                )}
                {userId ? (
                  <button
                    type="button"
                    className={`catalog-secondary-link ${isFavorite ? "text-orange-700" : ""}`}
                    onClick={() => void handleToggleFavorite()}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {isFavorite ? t("favorited") : t("favorite")}
                  </button>
                ) : null}
                {userId ? (
                  <SubscribeButton
                    slug={slug}
                    isSubscribed={!loadingSubscription && subscribed}
                    onSubscribed={() => setSubscribed(true)}
                    onUnsubscribed={() => setSubscribed(false)}
                  />
                ) : (
                  <button className="catalog-secondary-link catalog-secondary-link--button" disabled type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {t("subscribe")}
                  </button>
                )}
                <ExportButton slug={slug} />
                <a
                  className="catalog-secondary-link"
                  href={asset.domain
                    ? `/data-model?domain=${encodeURIComponent(asset.domain)}${asset.context ? `&context=${encodeURIComponent(asset.context)}` : ""}&slug=${encodeURIComponent(slug)}`
                    : `/data-model?slug=${encodeURIComponent(slug)}`
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                  Data Model
                </a>
              </div>
            </div>

            <div className="contract-side-card contract-side-card--history">
              <div className="contract-side-card__header">
                <h2>{t("history")}</h2>
                <div className="contract-side-card__header-actions">
                  <ContractDiffDialog slug={slug} currentYamlRaw={displayedYamlRaw} currentData={displayedData} historyEntries={historyEntries} onClose={() => {}} />
                  {historyEntries.length > 6 ? (
                    <button
                      className="contract-side-card__link"
                      onClick={() => historyDialogRef.current?.showModal()}
                      type="button"
                    >
                      {t("viewMore")}
                    </button>
                  ) : null}
                </div>
              </div>
              {historyError ? <p className="contract-side-card__muted">{historyError}</p> : null}
              {historyItems.length > 0 ? (
                <div className="contract-side-history-list">
                  {historyItems.map((entry) => (
                    <article
                      key={entry.id}
                      className={activeVersion?.entry.id === entry.id ? "contract-side-history-row is-active" : "contract-side-history-row"}
                    >
                      <div className="contract-side-history-row__header">
                        <strong>{entry.title}</strong>
                        <button
                          aria-label={t("openThisVersion")}
                          className="contract-side-history-row__eye"
                          disabled={loadingHistoryId === entry.id}
                          onClick={() => void handleOpenHistory(entry)}
                          title={t("openThisVersion")}
                          type="button"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M10 3.5c4.08 0 7.47 2.9 8.23 6.75-.76 3.85-4.15 6.75-8.23 6.75s-7.47-2.9-8.23-6.75C2.53 6.4 5.92 3.5 10 3.5zm0 2C7.22 5.5 4.82 7.35 3.9 10c.92 2.65 3.32 4.5 6.1 4.5s5.18-1.85 6.1-4.5c-.92-2.65-3.32-4.5-6.1-4.5zm0 1.75A2.75 2.75 0 1110 12.75 2.75 2.75 0 0110 7.25z" />
                          </svg>
                        </button>
                      </div>
                      <span className="contract-side-history-row__meta">
                        {entry.shortId} {formatHistoryMeta(entry.authoredDate) ? `· ${formatHistoryMeta(entry.authoredDate)}` : ""}
                      </span>
                      <span className="contract-side-history-row__meta">{entry.authorName}</span>
                      {entry.description ? <p>{entry.description}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="contract-side-card__muted">{t("historyUnavailable")}</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <dialog ref={historyDialogRef} className="yaml-sheet yaml-sheet--history" aria-labelledby={`history-sheet-title-${historyDialogId}`}>
        <form method="dialog" className="yaml-sheet__backdrop">
          <button className="yaml-sheet__scrim" aria-label={t("close")} />
        </form>

        <div className="yaml-sheet__panel yaml-sheet__panel--history">
          <div className="yaml-sheet__header">
            <div>
              <p className="yaml-sheet__eyebrow">{t("contractActivity")}</p>
              <h3 id={`history-sheet-title-${historyDialogId}`}>{t("historyTitle")}</h3>
            </div>

            <div className="yaml-sheet__header-actions">
              <button className="editor-soft-button" onClick={() => historyDialogRef.current?.close()} type="button">
                {t("close")}
              </button>
            </div>
          </div>

          <div className="yaml-sheet__body yaml-sheet__body--history">
            <div className="contract-side-history-list">
              {historyEntries.map((entry) => (
                <article
                  key={entry.id}
                  className={activeVersion?.entry.id === entry.id ? "contract-side-history-row is-active" : "contract-side-history-row"}
                >
                  <div className="contract-side-history-row__header">
                    <strong>{entry.title}</strong>
                    <button
                      aria-label={t("openThisVersion")}
                      className="contract-side-history-row__eye"
                      disabled={loadingHistoryId === entry.id}
                      onClick={() => {
                        void handleOpenHistory(entry);
                        historyDialogRef.current?.close();
                      }}
                      title={t("openThisVersion")}
                      type="button"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M10 3.5c4.08 0 7.47 2.9 8.23 6.75-.76 3.85-4.15 6.75-8.23 6.75s-7.47-2.9-8.23-6.75C2.53 6.4 5.92 3.5 10 3.5zm0 2C7.22 5.5 4.82 7.35 3.9 10c.92 2.65 3.32 4.5 6.1 4.5s5.18-1.85 6.1-4.5c-.92-2.65-3.32-4.5-6.1-4.5zm0 1.75A2.75 2.75 0 1110 12.75 2.75 2.75 0 0110 7.25z" />
                      </svg>
                    </button>
                  </div>
                  <span className="contract-side-history-row__meta">
                    {entry.shortId} {formatHistoryMeta(entry.authoredDate) ? `· ${formatHistoryMeta(entry.authoredDate)}` : ""}
                  </span>
                  <span className="contract-side-history-row__meta">{entry.authorName}</span>
                  {entry.description ? <p>{entry.description}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </main>
  );
}
