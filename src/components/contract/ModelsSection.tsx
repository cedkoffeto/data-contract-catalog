"use client";

import { useCallback, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { ModelFieldsTable } from "@/src/components/contract/ModelFieldsTable";
import { toArray } from "@/src/lib/format";
import { useT } from "@/src/lib/use-i18n";
import type { Asset, ContractField } from "@/src/lib/types";

export function ModelsSection({
  asset,
  fields,
  primaryKey,
  grain,
  slug,
  userId,
  fieldAnnotations,
  onFieldClick,
  onAnnotationPosted
}: {
  asset: Asset;
  fields: ContractField[];
  primaryKey: string[] | string | undefined;
  grain?: string;
  slug?: string;
  userId?: string;
  fieldAnnotations?: Record<string, number>;
  onFieldClick?: (fieldName: string) => void;
  onAnnotationPosted?: () => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandableIds, setExpandableIds] = useState<string[]>([]);

  const handleToggleAll = useCallback(() => {
    setExpanded((prev) => {
      if (prev.size > 0) {
        return new Set();
      }
      return new Set(expandableIds);
    });
  }, [expandableIds]);

  if (!fields || fields.length === 0) {
    return null;
  }

  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expanded.has(id));

  const primaryKeyValue = toArray(primaryKey).join(", ");

  return (
    <section id="models">
      <div className="flex justify-between">
        <div className="px-4 sm:px-0">
          <h1 className="text-base font-semibold leading-6 text-gray-900">{t("sectionModel")}</h1>
          <p className="text-sm text-gray-500">{t("sectionModelDesc")}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 mx-4 sm:mx-0">
        <Search size={14} className="shrink-0 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchFields")}
          className="min-w-0 flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="contract-models-shell">
              <table className="contract-models-table">
                <thead className="contract-models-table__head">
                  <tr>
                    <th scope="colgroup" colSpan={4} className="contract-models-table__title">
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="inline-flex items-center">
                          <span>{asset.name ?? "default"}</span>
                          <span className="contract-models-pill">
                            table
                          </span>
                        </span>
                        {expandableIds.length > 0 ? (
                          <button
                            type="button"
                            onClick={handleToggleAll}
                            aria-label={allExpanded ? t("collapseAll") : t("expandAll")}
                            title={allExpanded ? t("collapseAll") : t("expandAll")}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            {allExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        ) : null}
                      </div>
                      {grain ? <div className="contract-models-table__grain">{grain}</div> : null}
                    </th>
                  </tr>
                  <tr>
                    <th scope="col" className="contract-models-table__header-cell">{t("columnField")}</th>
                    <th scope="col" className="contract-models-table__header-cell">{t("type")}</th>
                    <th scope="col" className="contract-models-table__header-cell">PII</th>
                    <th scope="col" className="contract-models-table__header-cell">{t("columnDescription")}</th>
                  </tr>
                </thead>

                <ModelFieldsTable fields={fields} slug={slug} userId={userId} fieldAnnotations={fieldAnnotations} onFieldClick={onFieldClick} onAnnotationPosted={onAnnotationPosted} searchQuery={query} expanded={expanded} onExpandedChange={setExpanded} onExpandableIdsChange={setExpandableIds} />

                {primaryKeyValue ? (
                  <tfoot className="contract-models-table__foot">
                    <tr>
                      <th scope="colgroup" colSpan={4} className="contract-models-table__primary-key">
                        <span>{t("sectionModelPrimaryKey")} : {primaryKeyValue}</span>
                      </th>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
