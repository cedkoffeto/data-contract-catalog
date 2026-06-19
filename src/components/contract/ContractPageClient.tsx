"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import yaml from "js-yaml";

import { ContractBody } from "@/src/components/contract/ContractBody";
import { ContractComments } from "@/src/components/contract/ContractComments";
import { ContractHeader } from "@/src/components/contract/ContractHeader";
import { ContractIssues } from "@/src/components/contract/ContractIssues";
import { ContractDiffDialog } from "@/src/components/contract/ContractDiffDialog";
import { SubscribeModal } from "@/src/components/contract/SubscribeModal";
import { YamlDialogButton } from "@/src/components/contract/YamlDialogButton";
import type { ContractHistoryEntry, DataContract } from "@/src/lib/types";
import type { Subscription } from "@/src/lib/subscriptions";

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
  historyEntries,
  slug,
  yamlRaw,
  userId,
  canEdit,
  canAdmin
}: {
  data: DataContract;
  historyEntries: ContractHistoryEntry[];
  slug: string;
  yamlRaw: string;
  userId?: string;
  canEdit: boolean;
  canAdmin: boolean;
}) {
  const [activeVersion, setActiveVersion] = useState<{
    entry: ContractHistoryEntry;
    data: DataContract;
    yamlRaw: string;
  } | null>(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyDialogRef = useRef<HTMLDialogElement>(null);
  const historyDialogId = useId().replace(/:/g, "");

  const [subscribed, setSubscribed] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [issueCount, setIssueCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "issues">("details");

  useEffect(() => {
    if (!userId) {
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
  }, [slug, userId]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`).then((res) => (res.ok ? (res.json() as Promise<{ comments: unknown[] }>) : null)),
      fetch(`/api/contracts/${encodeURIComponent(slug)}/issues`).then((res) => (res.ok ? (res.json() as Promise<{ issues: unknown[] }>) : null)),
    ]).then(([commentsPayload, issuesPayload]) => {
      if (commentsPayload) setCommentCount(commentsPayload.comments.length);
      if (issuesPayload) setIssueCount(issuesPayload.issues.length);
    });
  }, [slug]);

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

  function TabIcon({ name }: { name: "details" | "comments" | "issues" }) {
    if (name === "comments") {
      return (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h6.75M21 12c0 4.142-3.582 7.5-8 7.5a8.8 8.8 0 0 1-2.25-.29L6 20.25l.9-3.15A7.05 7.05 0 0 1 5 12c0-4.142 3.582-7.5 8-7.5s8 3.358 8 7.5Z" />
        </svg>
      );
    }

    if (name === "issues") {
      return (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-5.25V9m0 12a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        </svg>
      );
    }

    return (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.575 16.5 9v6L7.5 19.425a1.5 1.5 0 0 1-2.121-1.421V6a1.5 1.5 0 0 1 2.121-1.425ZM16.5 9 7.5 4.575" />
      </svg>
    );
  }

  function ContractTab({ id, label, count, icon }: { id: "details" | "comments" | "issues"; label: string; count?: number; icon: "details" | "comments" | "issues" }) {
    const isActive = activeTab === id;
    const isFirst = id === "details";
    const isLast = id === "issues";
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
        className={`group relative flex min-w-max items-center gap-2 px-6 py-3 text-sm font-bold transition hover:-translate-y-px focus:outline-none ${isFirst ? "ml-0" : "-ml-px"} ${isActive ? "z-20" : "z-10"}`}
        style={{
          clipPath,
          backgroundColor: isActive ? "#f97316" : "#f8fafc",
          color: isActive ? "#ffffff" : "#64748b",
          boxShadow: isActive ? "0 8px 18px rgba(249, 115, 22, 0.22)" : "0 1px 2px rgba(15, 23, 42, 0.06)",
        }}
      >
        <span className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}>
          <TabIcon name={icon} />
        </span>
        {label}
        {count !== undefined ? (
          <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${isActive ? "bg-white text-orange-700" : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"}`}>
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
                  <span className="contract-version-banner__tag">Version {activeVersion.entry.shortId}</span>
                  <strong>{activeVersion.entry.title}</strong>
                </div>
                <button className="editor-soft-button editor-soft-button--compact" onClick={() => setActiveVersion(null)} type="button">
                  Back to current
                </button>
              </div>
            ) : null}

            <ContractHeader asset={asset} showActions={false} />

            <section className="contract-summary-strip">
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">Schema fields</span>
                <strong>{fields}</strong>
              </article>
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">Input sources</span>
                <strong>{sources}</strong>
              </article>
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">Quality checks</span>
                <strong>{qualityChecks}</strong>
              </article>
              <article className="contract-summary-strip__card">
                <span className="contract-summary-strip__label">Lifecycle</span>
                <strong>{asset.status ?? "Draft"}</strong>
              </article>
            </section>

            <div className="contract-content-shell">
              <div className="contract-content-shell__main">
                <div className="sticky top-0 z-10 mb-4 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
                  <div role="tablist" aria-label="Contract sections" className="flex overflow-x-auto">
                    <ContractTab id="details" label="Details" icon="details" />
                    <ContractTab id="comments" label="Comments" count={commentCount} icon="comments" />
                    <ContractTab id="issues" label="Issues" count={issueCount} icon="issues" />
                  </div>
                </div>
                <div className={activeTab === "details" ? "" : "hidden"}>
                  <ContractBody data={displayedData} />
                </div>
                <div className={activeTab === "comments" ? "" : "hidden"}>
                  <ContractComments slug={slug} userId={userId} />
                </div>
                <div className={activeTab === "issues" ? "" : "hidden"}>
                  <ContractIssues slug={slug} userId={userId} canAdmin={canAdmin} />
                </div>
              </div>
            </div>
          </div>

          <aside className="contract-side-panel">
            <div className="contract-side-card contract-side-card--actions">
              <h2>Workspace</h2>
              <p>Review, edit and follow this contract from one place.</p>
              <div className="contract-side-card__actions">
                {canEdit ? (
                  <a className="catalog-primary-link" href={`/editor?contract=${encodeURIComponent(slug)}`}>
                    Open editor
                  </a>
                ) : (
                  <button
                    className="catalog-primary-link catalog-primary-link--disabled"
                    disabled
                    title="Vous n'avez pas les droits editor ou admin pour modifier ce contrat"
                    type="button"
                  >
                    Open editor
                  </button>
                )}
                {userId ? (
                  <SubscribeModal
                    slug={slug}
                    isSubscribed={!loadingSubscription && subscribed}
                    onSubscribed={() => setSubscribed(true)}
                    onUnsubscribed={() => setSubscribed(false)}
                    onClose={() => {}}
                  />
                ) : (
                  <button className="catalog-secondary-link catalog-secondary-link--button" disabled type="button">
                    Subscribe
                  </button>
                )}
                <YamlDialogButton yamlRaw={displayedYamlRaw} />
              </div>
            </div>

            <div className="contract-side-card contract-side-card--history">
              <div className="contract-side-card__header">
                <h2>History</h2>
                <div className="contract-side-card__header-actions">
                  <ContractDiffDialog slug={slug} currentYamlRaw={displayedYamlRaw} currentData={displayedData} historyEntries={historyEntries} onClose={() => {}} />
                  {historyEntries.length > 6 ? (
                    <button
                      className="contract-side-card__link"
                      onClick={() => historyDialogRef.current?.showModal()}
                      type="button"
                    >
                      View more
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
                          aria-label="Open this version"
                          className="contract-side-history-row__eye"
                          disabled={loadingHistoryId === entry.id}
                          onClick={() => void handleOpenHistory(entry)}
                          title="Open this version"
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
                <p className="contract-side-card__muted">History unavailable for this contract.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <dialog ref={historyDialogRef} className="yaml-sheet yaml-sheet--history" aria-labelledby={`history-sheet-title-${historyDialogId}`}>
        <form method="dialog" className="yaml-sheet__backdrop">
          <button className="yaml-sheet__scrim" aria-label="Close history panel" />
        </form>

        <div className="yaml-sheet__panel yaml-sheet__panel--history">
          <div className="yaml-sheet__header">
            <div>
              <p className="yaml-sheet__eyebrow">Contract activity</p>
              <h3 id={`history-sheet-title-${historyDialogId}`}>History</h3>
            </div>

            <div className="yaml-sheet__header-actions">
              <button className="editor-soft-button" onClick={() => historyDialogRef.current?.close()} type="button">
                Close
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
                      aria-label="Open this version"
                      className="contract-side-history-row__eye"
                      disabled={loadingHistoryId === entry.id}
                      onClick={() => {
                        void handleOpenHistory(entry);
                        historyDialogRef.current?.close();
                      }}
                      title="Open this version"
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
