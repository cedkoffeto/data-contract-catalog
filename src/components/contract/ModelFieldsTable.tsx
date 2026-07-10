"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

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

export function ModelFieldsTable({ fields, slug, userId, fieldAnnotations, onFieldClick, onAnnotationPosted }: { fields: ContractField[]; slug?: string; userId?: string; fieldAnnotations?: Record<string, number>; onFieldClick?: (fieldName: string) => void; onAnnotationPosted?: () => void }) {
  const rows = useMemo(() => flattenFields(fields), [fields]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [annotating, setAnnotating] = useState<FlatField | null>(null);
  const [annotationText, setAnnotationText] = useState("");

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

  async function handleAnnotate() {
    if (!userId || !slug || !annotating) return;
    const text = annotationText.trim();
    if (!text) return;

    await fetch(`/api/contracts/${encodeURIComponent(slug)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: `[${annotating.name}] — ${text}`, targetField: annotating.name }),
    });

    setAnnotating(null);
    setAnnotationText("");
    onAnnotationPosted?.();
  }

  function openAnnotate(row: FlatField) {
    setAnnotating(row);
    setAnnotationText("");
  }

  return (
    <>
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
                {userId && slug ? (
                  <div className="ml-auto flex items-center justify-end gap-1">
                    {fieldAnnotations?.[row.name] ? (
                      <button
                        type="button"
                        className="rounded-full bg-orange-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-orange-600 cursor-pointer"
                        onClick={() => onFieldClick?.(row.name)}
                      >
                        {fieldAnnotations[row.name]}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-full bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-700 hover:bg-orange-100 cursor-pointer"
                      onClick={() => openAnnotate(row)}
                    >
                      Annotate
                    </button>
                  </div>
                ) : null}
              </div>
            </td>

            <td className="contract-models-cell contract-models-cell--type">
              <div className="flex items-center" style={{ minHeight: "1.9rem" }}>
                <span className="contract-models-type">{row.type}</span>
              </div>
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
    {annotating && userId ? createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={() => { setAnnotating(null); setAnnotationText(""); }} />
        <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
          <h3 className="text-base font-semibold text-gray-900">Annotation pour {annotating.name}</h3>
          <textarea
            className="mt-4 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={4}
            placeholder="Écrivez votre annotation..."
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            autoFocus
          />
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => { setAnnotating(null); setAnnotationText(""); }}
              className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void handleAnnotate()}
              disabled={!annotationText.trim()}
              className="catalog-primary-link"
            >
              Annoter
            </button>
          </div>
        </div>
      </div>,
      document.body
    ) : null}
    </>
  );
}
