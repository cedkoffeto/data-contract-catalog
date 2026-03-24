"use client";

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
        const piiClass = ["direct", "sensitive"].includes(row.piiClassification) ? "yellow" : "blue";

        return (
          <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
            <td className="whitespace-nowrap py-3 pr-3 text-sm font-medium text-gray-900" style={{ paddingLeft: `${1 + row.depth * 1.5}rem` }}>
              <div className="flex items-center">
                {row.depth > 0 ? <span className="mr-2 text-gray-300">↳</span> : null}
                {row.hasChildren ? (
                  <button
                    onClick={() => toggle(row.id)}
                    type="button"
                    style={{ marginRight: "4px", padding: "2px", borderRadius: "4px" }}
                    className="inline-flex cursor-pointer items-center border-none bg-transparent transition-transform duration-200 hover:bg-gray-100 focus:outline-none"
                  >
                    <svg
                      style={{ width: "12px", height: "12px", color: "#9ca3af", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : row.depth > 0 ? (
                  <span style={{ display: "inline-block", width: "16px", marginRight: "4px" }} />
                ) : null}
                <span>{row.name}</span>
              </div>
            </td>

            <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
              <span className="font-mono text-xs text-gray-500">{row.type}</span>
            </td>

            <td className="px-3 py-3 text-sm text-gray-500">
              <div>{row.description}</div>

              {row.businessRules.length > 0 ? (
                <div className="mt-1 text-xs text-gray-500">Rules: {row.businessRules.join(", ")}</div>
              ) : null}

              {row.example !== undefined && row.example !== null && row.example !== "" ? (
                <div className="mt-1 italic">
                  Exemple : <span className="font-mono">{String(row.example)}</span>
                </div>
              ) : null}

              <div>
                {row.required ? (
                  <span className="mr-1 mt-1 inline-flex items-center rounded-md bg-gray-50 px-1 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                    requis
                  </span>
                ) : null}

                {row.piiClassification ? (
                  <span
                    className={`mr-1 mt-1 inline-flex items-center rounded-md bg-${piiClass}-50 px-1 py-1 text-xs font-medium text-${piiClass}-600 ring-1 ring-inset ring-${piiClass}-500/10`}
                  >
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
