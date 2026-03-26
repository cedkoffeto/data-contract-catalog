"use client";

import { useMemo, useState } from "react";

import yaml from "js-yaml";

import { ContractBody } from "@/src/components/contract/ContractBody";
import { ContractHeader } from "@/src/components/contract/ContractHeader";
import { YamlDialogButton } from "@/src/components/contract/YamlDialogButton";
import type { ContractHistoryEntry, DataContract } from "@/src/lib/types";

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
  yamlRaw
}: {
  data: DataContract;
  historyEntries: ContractHistoryEntry[];
  slug: string;
  yamlRaw: string;
}) {
  const [activeVersion, setActiveVersion] = useState<{
    entry: ContractHistoryEntry;
    data: DataContract;
    yamlRaw: string;
  } | null>(null);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const displayedData = activeVersion?.data ?? data;
  const displayedYamlRaw = activeVersion?.yamlRaw ?? yamlRaw;
  const asset = displayedData.asset ?? {};
  const qualityChecks = displayedData.quality?.checks?.length ?? 0;
  const fields = displayedData.contract?.schema?.fields?.length ?? 0;
  const sources = displayedData.inputs?.sources?.length ?? 0;

  const historyItems = useMemo(() => historyEntries.slice(0, 8), [historyEntries]);

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
                <ContractBody data={displayedData} />
              </div>
            </div>
          </div>

          <aside className="contract-side-panel">
            <div className="contract-side-card contract-side-card--actions">
              <h2>Workspace</h2>
              <p>Review, edit and follow this contract from one place.</p>
              <div className="contract-side-card__actions">
                <a className="catalog-primary-link" href={`/editor?contract=${slug}`}>
                  Open editor
                </a>
                <button className="catalog-secondary-link catalog-secondary-link--button" type="button">
                  Subscribe
                </button>
                <YamlDialogButton yamlRaw={displayedYamlRaw} />
              </div>
            </div>

            <div className="contract-side-card contract-side-card--history">
              <h2>History</h2>
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
    </main>
  );
}
