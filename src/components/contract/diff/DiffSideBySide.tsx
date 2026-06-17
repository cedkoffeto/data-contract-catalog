"use client";

import type { SideBySideLine } from "@/src/lib/diff";

type HunkRange = [start: number, end: number];

export function DiffSideBySide({ lines, activeHunk, activeHunkIndex }: { lines: SideBySideLine[]; activeHunk: HunkRange | null; activeHunkIndex: number }) {
  if (lines.length === 0) {
    return <div className="diff-empty">No changes — versions are identical.</div>;
  }

  return (
    <div className="diff-side-by-side">
      <table className="diff-side-by-side__table">
        <tbody>
          {lines.map((line, index) => {
            const isHunkActive = activeHunk ? index >= activeHunk[0] && index <= activeHunk[1] : false;
            return (
              <tr
                key={index}
                data-hunk={isHunkActive ? activeHunkIndex : undefined}
                className={`diff-side-by-side__row diff-side-by-side__row--${line.type}${isHunkActive ? " diff-side-by-side__row--active" : ""}`}
              >
                <td className="diff-side-by-side__num">{line.left?.lineNumber ?? ""}</td>
                <td className="diff-side-by-side__content diff-side-by-side__content--left">
                  <pre>{line.left?.text ?? ""}</pre>
                </td>
                <td className="diff-side-by-side__num">{line.right?.lineNumber ?? ""}</td>
                <td className="diff-side-by-side__content diff-side-by-side__content--right">
                  <pre>{line.right?.text ?? ""}</pre>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
