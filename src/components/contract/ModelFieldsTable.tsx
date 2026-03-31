"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { ContractField } from "@/src/lib/types";

type FlatField = {
  id: string;
  parentId: string | null;
  depth: number;
  name: string;
  type: string;
  description: string;
  required: boolean;
  piiClassification: string;
  businessRules: string[];
  example: unknown;
  hasChildren: boolean;
};

function flattenFields(fields: ContractField[], depth = 0, parentId: string | null = null, seed = "f"): FlatField[] {
  const rows: FlatField[] = [];

  fields.forEach((field, index) => {
    const name = field.name ?? "";
    const id = `${seed}-${depth}-${index}-${name.replace(/\s+/g, "-")}`;
    const nested = field.fields ?? [];

    rows.push({
      id,
      parentId,
      depth,
      name,
      type: field.type ?? "",
      description: field.description ?? "",
      required: Boolean(field.required),
      piiClassification: field.pii_classification ?? "",
      businessRules: field.business_rules ?? [],
      example: field.example,
      hasChildren: nested.length > 0
    });

    if (nested.length > 0) {
      rows.push(...flattenFields(nested, depth + 1, id, `${seed}-${index}`));
    }
  });

  return rows;
}

export function ModelFieldsTable({ fields }: { fields: ContractField[] }) {
  const rows = useMemo(() => flattenFields(fields), [fields]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rowMap = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  function isVisible(row: FlatField): boolean {
    let parentId = row.parentId;
    while (parentId) {
      if (!expanded.has(parentId)) {
        return false;
      }
      parentId = rowMap.get(parentId)?.parentId ?? null;
    }
    return true;
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <tbody className="divide-y divide-gray-200 bg-white">
      {rows.filter(isVisible).map((row) => {
        const isExpanded = expanded.has(row.id);
        const piiClassName =
          ["direct", "sensitive"].includes(row.piiClassification)
            ? "contract-models-pill contract-models-pill--pii-alert"
            : "contract-models-pill contract-models-pill--pii";

        return (
          <tr
            key={row.id}
            className={row.depth > 0 ? "contract-models-row contract-models-row--nested" : "contract-models-row"}
          >
            <td className="contract-models-cell contract-models-cell--field">
              <div className="contract-models-field" style={{ "--field-depth": row.depth } as CSSProperties}>
                <div className="contract-models-field__tree" aria-hidden="true">
                  {Array.from({ length: row.depth }).map((_, index) => (
                    <span className="contract-models-field__guide" key={`${row.id}-guide-${index}`} />
                  ))}
                </div>
                {row.hasChildren ? (
                  <button
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Collapse ${row.name}` : `Expand ${row.name}`}
                    className="contract-models-toggle"
                    onClick={() => toggle(row.id)}
                    type="button"
                  >
                    <svg
                      className={isExpanded ? "contract-models-toggle__chevron is-open" : "contract-models-toggle__chevron"}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                ) : null}
                {!row.hasChildren ? <span className="contract-models-field__leaf" aria-hidden="true" /> : null}
                <span className="contract-models-field__name">{row.name}</span>
              </div>
            </td>

            <td className="contract-models-cell contract-models-cell--type">
              <span className="contract-models-type">{row.type}</span>
            </td>

            <td className="contract-models-cell contract-models-cell--details">
              <div>{row.description}</div>

              {row.businessRules.length > 0 ? (
                <div className="contract-models-details__meta">Rules: {row.businessRules.join(", ")}</div>
              ) : null}

              {row.example !== undefined && row.example !== null && row.example !== "" ? (
                <div className="contract-models-details__meta contract-models-details__meta--example">
                  Exemple : <span className="font-mono">{String(row.example)}</span>
                </div>
              ) : null}

              <div className="contract-models-details__pills">
                {row.required ? (
                  <span className="contract-models-pill">
                    requis
                  </span>
                ) : null}

                {row.piiClassification ? (
                  <span className={piiClassName}>
                    PII : {row.piiClassification}
                  </span>
                ) : null}
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}
