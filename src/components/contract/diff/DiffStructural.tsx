"use client";

import { useMemo } from "react";

import { computeWordDiff } from "@/src/lib/diff";
import type { StructuralChange, WordDiffSegment } from "@/src/lib/diff";

function formatValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function WordDiffView({ segments }: { segments: WordDiffSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          className={
            seg.type === "added"
              ? "diff-word-added"
              : seg.type === "removed"
                ? "diff-word-removed"
                : undefined
          }
        >
          {seg.text}
        </span>
      ))}
    </>
  );
}

export function DiffStructural({ changes }: { changes: StructuralChange[] }) {
  const wordDiffCache = useMemo(() => {
    const cache = new Map<string, [WordDiffSegment[], WordDiffSegment[]]>();
    for (const change of changes) {
      if (change.type === "modified" && typeof change.oldValue === "string" && typeof change.newValue === "string") {
        const key = `${change.oldValue}\0${change.newValue}`;
        if (!cache.has(key)) cache.set(key, computeWordDiff(change.oldValue, change.newValue));
      }
    }
    return cache;
  }, [changes]);

  const grouped = useMemo(() => {
    const sections: Record<string, StructuralChange[]> = {};

    for (const change of changes) {
      const section = change.path.split(".")[0] ?? "other";
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(change);
    }

    return Object.entries(sections).sort(([a], [b]) => a.localeCompare(b));
  }, [changes]);

  if (changes.length === 0) {
    return <div className="diff-empty">No field changes — versions are structurally identical.</div>;
  }

  return (
    <div className="diff-structural">
      {grouped.map(([section, items]) => (
        <div key={section} className="diff-structural__section">
          <h4 className="diff-structural__section-title">{section}</h4>
          <table className="diff-structural__table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Change</th>
                <th>Old value</th>
                <th>New value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((change, index) => {
                const oldText = typeof change.oldValue === "string" ? change.oldValue : formatValue(change.oldValue);
                const newText = typeof change.newValue === "string" ? change.newValue : formatValue(change.newValue);
                const wordDiff = change.type === "modified" && typeof change.oldValue === "string" && typeof change.newValue === "string"
                  ? (wordDiffCache.get(`${change.oldValue}\0${change.newValue}`) ?? null)
                  : null;
                return (
                <tr key={index} className={`diff-structural__row diff-structural__row--${change.type}`}>
                  <td className="diff-structural__path">
                    <code>{change.path}</code>
                  </td>
                  <td>
                    <span className={`diff-structural__badge diff-structural__badge--${change.type}`}>
                      {change.type === "added" ? "Added" : change.type === "removed" ? "Removed" : "Modified"}
                    </span>
                  </td>
                  <td className={`diff-structural__value diff-structural__value--old ${change.type === "removed" && !wordDiff ? "diff-structural__value--removed" : ""}`}>
                    <pre>{wordDiff ? <WordDiffView segments={wordDiff[0]} /> : change.type !== "added" ? oldText : ""}</pre>
                  </td>
                  <td className={`diff-structural__value diff-structural__value--new ${change.type === "added" && !wordDiff ? "diff-structural__value--added" : ""}`}>
                    <pre>{wordDiff ? <WordDiffView segments={wordDiff[1]} /> : change.type !== "removed" ? newText : ""}</pre>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
