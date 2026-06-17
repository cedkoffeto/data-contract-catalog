"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DiffResult, SideBySideLine } from "@/src/lib/diff";

import { DiffSideBySide } from "./DiffSideBySide";
import { DiffStructural } from "./DiffStructural";
import type { DiffViewMode } from "./types";

const TABS: { key: DiffViewMode; label: string }[] = [
  { key: "side-by-side", label: "Side-by-side" },
  { key: "unified", label: "Unified" },
  { key: "structural", label: "Fields" }
];

type HunkRange = [start: number, end: number];

function computeHunks(changes: DiffResult["unified"]): HunkRange[] {
  const hunks: HunkRange[] = [];
  let start: number | null = null;

  for (let index = 0; index < changes.length; index += 1) {
    if (changes[index].type !== "unchanged") {
      if (start === null) start = index;
    } else if (start !== null) {
      hunks.push([start, index - 1]);
      start = null;
    }
  }
  if (start !== null) {
    hunks.push([start, changes.length - 1]);
  }

  return hunks;
}

export function DiffView({
  diff,
  fromLabel,
  toLabel
}: {
  diff: DiffResult;
  fromLabel: string;
  toLabel: string;
}) {
  const [mode, setMode] = useState<DiffViewMode>("side-by-side");
  const scrollRef = useRef<HTMLDivElement>(null);

  const hunks = useMemo(() => computeHunks(diff.unified), [diff.unified]);
  const [activeHunkIndex, setActiveHunkIndex] = useState(0);

  useEffect(() => {
    setActiveHunkIndex(0);
  }, [diff]);

  useEffect(() => {
    if (mode === "structural" || hunks.length === 0) return;

    const target = scrollRef.current?.querySelector<HTMLElement>(`[data-hunk="${activeHunkIndex}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeHunkIndex, mode, hunks.length]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const change of diff.unified) {
      if (change.type === "added") added += 1;
      if (change.type === "removed") removed += 1;
    }
    return { added, removed, structural: diff.structural.length };
  }, [diff]);

  function goToPrevHunk() {
    setActiveHunkIndex((prev) => Math.max(0, prev - 1));
  }

  function goToNextHunk() {
    setActiveHunkIndex((prev) => Math.min(hunks.length - 1, prev + 1));
  }

  const hasChanges = diff.unified.some((c) => c.type !== "unchanged");
  const currentHunk = hunks[activeHunkIndex];

  return (
    <div className="diff-view">
      <div className="diff-view__toolbar">
        <div className="diff-view__tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`diff-view__tab${mode === tab.key ? " is-active" : ""}`}
              onClick={() => setMode(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="diff-view__toolbar-right">
          {hasChanges && mode !== "structural" ? (
            <div className="diff-view__nav">
              <button
                className="diff-view__nav-btn"
                disabled={activeHunkIndex <= 0}
                onClick={goToPrevHunk}
                title="Previous change"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 16.5a.75.75 0 01-.75-.75V7.56l-1.97 1.97a.75.75 0 11-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 11-1.06 1.06l-1.97-1.97v8.19a.75.75 0 01-.75.75z" />
                </svg>
              </button>
              <span className="diff-view__nav-counter">
                {hunks.length > 0 ? `${activeHunkIndex + 1} / ${hunks.length}` : "—"}
              </span>
              <button
                className="diff-view__nav-btn"
                disabled={activeHunkIndex >= hunks.length - 1}
                onClick={goToNextHunk}
                title="Next change"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 3.5a.75.75 0 01.75.75v8.19l1.97-1.97a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0l-3.25-3.25a.75.75 0 111.06-1.06l1.97 1.97V4.25A.75.75 0 0110 3.5z" />
                </svg>
              </button>
            </div>
          ) : null}

          <div className="diff-view__stats">
            <span className="diff-view__stat diff-view__stat--added">+{stats.added}</span>
            <span className="diff-view__stat diff-view__stat--removed">-{stats.removed}</span>
            {stats.structural > 0 ? (
              <span className="diff-view__stat diff-view__stat--changed">{stats.structural} fields</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="diff-view__labels">
        <span className="diff-view__label diff-view__label--from">{fromLabel}</span>
        <span className="diff-view__label diff-view__label--to">{toLabel}</span>
      </div>

      <div ref={scrollRef} className="diff-view__scroll">
        {mode === "side-by-side" && (
          <DiffSideBySide lines={diff.sideBySide} activeHunk={currentHunk ?? null} activeHunkIndex={activeHunkIndex} />
        )}
        {mode === "unified" && (
          <DiffUnified changes={diff.unified} activeHunk={currentHunk ?? null} activeHunkIndex={activeHunkIndex} />
        )}
        {mode === "structural" && <DiffStructural changes={diff.structural} />}
      </div>
    </div>
  );
}

function DiffUnified({
  changes,
  activeHunk,
  activeHunkIndex
}: {
  changes: DiffResult["unified"];
  activeHunk: HunkRange | null;
  activeHunkIndex: number;
}) {
  return (
    <div className="diff-unified">
      {changes.length === 0 ? (
        <div className="diff-empty">No changes — versions are identical.</div>
      ) : (
        <table className="diff-unified__table">
          <tbody>
            {changes.map((change, index) => {
              const isHunkActive = activeHunk ? index >= activeHunk[0] && index <= activeHunk[1] : false;
              return (
                <tr
                  key={index}
                  data-hunk={isHunkActive ? activeHunkIndex : undefined}
                  className={`diff-unified__row diff-unified__row--${change.type}${isHunkActive ? " diff-unified__row--active" : ""}`}
                >
                  <td className="diff-unified__line-num">
                    {change.type === "unchanged" ? "" : change.type === "added" ? "+" : "-"}
                  </td>
                  <td className="diff-unified__content">
                    <pre>{change.value}</pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
