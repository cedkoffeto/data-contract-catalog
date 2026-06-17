"use client";

import { useMemo } from "react";

import type { StructuralChange } from "@/src/lib/diff";

function formatValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function DiffStructural({ changes }: { changes: StructuralChange[] }) {
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
              {items.map((change, index) => (
                <tr key={index} className={`diff-structural__row diff-structural__row--${change.type}`}>
                  <td className="diff-structural__path">
                    <code>{change.path}</code>
                  </td>
                  <td>
                    <span className={`diff-structural__badge diff-structural__badge--${change.type}`}>
                      {change.type === "added" ? "Added" : change.type === "removed" ? "Removed" : "Modified"}
                    </span>
                  </td>
                  <td className="diff-structural__value diff-structural__value--old">
                    <pre>{formatValue(change.oldValue)}</pre>
                  </td>
                  <td className="diff-structural__value diff-structural__value--new">
                    <pre>{formatValue(change.newValue)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
