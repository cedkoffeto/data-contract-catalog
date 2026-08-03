"use client";

import { useCallback, useMemo } from "react";
import type { WidgetProps } from "@rjsf/utils";
import type { SlugIndexEntry } from "@/src/lib/editor-autocomplete";

function parseRef(ref: string) {
  const m = ref.match(/^@([^.]+)\.([^\s>]+)\s*>\s*@([^.]+)\.(.+)$/);
  if (!m) return null;
  return { sourceSlug: m[1], sourceField: m[2], targetSlug: m[3], targetField: m[4] };
}

export function RelationRefWidget(props: WidgetProps) {
  const { onChange } = props;
  const slugIndex = useMemo(
    () => (props.formContext?.slugIndex ?? new Map()) as Map<string, SlugIndexEntry>,
    [props.formContext],
  );

  const parsed = useMemo(() => parseRef(props.value ?? ""), [props.value]);

  const slugList = useMemo(
    () => Array.from(slugIndex.entries()).sort(([a], [b]) => a.localeCompare(b)),
    [slugIndex],
  );

  const sourceFields = useMemo(() => {
    if (!parsed) return [];
    const entry = slugIndex.get(parsed.sourceSlug);
    return entry?.fields ?? [];
  }, [slugIndex, parsed]);

  const targetFields = useMemo(() => {
    if (!parsed) return [];
    const entry = slugIndex.get(parsed.targetSlug);
    return entry?.fields ?? [];
  }, [slugIndex, parsed]);

  const setValue = useCallback(
    (sourceSlug: string, sourceField: string, targetSlug: string, targetField: string) => {
      onChange(`@${sourceSlug}.${sourceField} > @${targetSlug}.${targetField}`);
    },
    [onChange],
  );

  const sourceSlug = parsed?.sourceSlug ?? "";
  const sourceField = parsed?.sourceField ?? "";
  const targetSlug = parsed?.targetSlug ?? "";
  const targetField = parsed?.targetField ?? "";

  const baseSelect =
    "block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs font-medium text-gray-500">Source</span>
        <select
          className={`${baseSelect} flex-1`}
          value={sourceSlug}
          onChange={(e) => {
            const slug = e.target.value;
            const entry = slugIndex.get(slug);
            const firstField = entry?.fields?.[0] ?? "";
            setValue(slug, firstField, targetSlug, targetField);
          }}
        >
          <option value="" disabled>
            Select table...
          </option>
          {slugList.map(([slug]) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
        <select
          className={`${baseSelect} flex-1`}
          value={sourceField}
          onChange={(e) => setValue(sourceSlug, e.target.value, targetSlug, targetField)}
          disabled={!sourceSlug}
        >
          <option value="" disabled>
            Select field...
          </option>
          {sourceFields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs font-medium text-gray-500">Target</span>
        <select
          className={`${baseSelect} flex-1`}
          value={targetSlug}
          onChange={(e) => {
            const slug = e.target.value;
            const entry = slugIndex.get(slug);
            const firstField = entry?.fields?.[0] ?? "";
            setValue(sourceSlug, sourceField, slug, firstField);
          }}
        >
          <option value="" disabled>
            Select table...
          </option>
          {slugList.map(([slug]) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
        <select
          className={`${baseSelect} flex-1`}
          value={targetField}
          onChange={(e) => setValue(sourceSlug, sourceField, targetSlug, e.target.value)}
          disabled={!targetSlug}
        >
          <option value="" disabled>
            Select field...
          </option>
          {targetFields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
