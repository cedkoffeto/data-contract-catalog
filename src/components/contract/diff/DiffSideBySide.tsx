"use client";

import { useMemo } from "react";

import type { SideBySideLine, WordDiffSegment } from "@/src/lib/diff";
import { computeWordDiff } from "@/src/lib/diff";

type HunkRange = [start: number, end: number];

function renderInline(segments: WordDiffSegment[], highlightType: "removed" | "added") {
  return segments.map((seg, i) =>
    seg.type === "same" ? (
      <span key={i}>{seg.text}</span>
    ) : seg.type === highlightType ? (
      <span key={i} className={`diff-inline diff-inline--${seg.type}`}>{seg.text}</span>
    ) : null
  );
}

export function DiffSideBySide({ lines, activeHunk, activeHunkIndex }: { lines: SideBySideLine[]; activeHunk: HunkRange | null; activeHunkIndex: number }) {
  const wordDiffCache = useMemo(() => {
    const cache = new Map<string, [WordDiffSegment[], WordDiffSegment[]]>();
    for (const line of lines) {
      if (line.type === "modified" && line.left?.text != null && line.right?.text != null) {
        const key = `${line.left.text}\0${line.right.text}`;
        if (!cache.has(key)) {
          cache.set(key, computeWordDiff(line.left.text, line.right.text));
        }
      }
    }
    return cache;
  }, [lines]);

  if (lines.length === 0) {
    return <div className="diff-empty">No changes — versions are identical.</div>;
  }

  return (
    <div className="diff-side-by-side">
      <table className="diff-side-by-side__table">
        <tbody>
          {lines.map((line, index) => {
            const isHunkActive = activeHunk ? index >= activeHunk[0] && index <= activeHunk[1] : false;

            let leftContent: React.ReactNode = line.left?.text ?? "";
            let rightContent: React.ReactNode = line.right?.text ?? "";
            let isModified = false;

            if (line.type === "modified" && line.left?.text != null && line.right?.text != null) {
              const cacheKey = `${line.left.text}\0${line.right.text}`;
              const segments = wordDiffCache.get(cacheKey);
              if (segments) {
                leftContent = (
                  <div className="diff-inline-line diff-inline-line--old">
                    <pre className="diff-inline-pre">{renderInline(segments[0], "removed")}</pre>
                  </div>
                );
                rightContent = (
                  <div className="diff-inline-line diff-inline-line--new">
                    <pre className="diff-inline-pre">{renderInline(segments[1], "added")}</pre>
                  </div>
                );
                isModified = true;
              }
            }

            return (
              <tr
                key={index}
                data-hunk={isHunkActive ? activeHunkIndex : undefined}
                className={`diff-side-by-side__row diff-side-by-side__row--${line.type}${isHunkActive ? " diff-side-by-side__row--active" : ""}`}
              >
                <td className="diff-side-by-side__num">{line.left?.lineNumber ?? ""}</td>
                <td className={`diff-side-by-side__content diff-side-by-side__content--left${isModified ? " diff-side-by-side__content--modified" : ""}`}>
                  {isModified ? leftContent : <pre>{leftContent}</pre>}
                </td>
                <td className="diff-side-by-side__num">{line.right?.lineNumber ?? ""}</td>
                <td className={`diff-side-by-side__content diff-side-by-side__content--right${isModified ? " diff-side-by-side__content--modified" : ""}`}>
                  {isModified ? rightContent : <pre>{rightContent}</pre>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
