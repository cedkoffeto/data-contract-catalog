"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/src/lib/format";

type Option = {
  value: string;
  label: string;
  sublabel?: string;
};

export function SearchableMultiSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyLabel
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function toggleOpen() {
    if (disabled) return;
    const next = !open;
    if (next) {
      const trigger = wrapperRef.current?.querySelector(".ss-multi__trigger");
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setFlip(spaceBelow < 260);
      }
    }
    setOpen(next);
    setQuery("");
    if (next) setTimeout(() => inputRef.current?.focus(), 0);
  }

  function toggleOption(optionValue: string) {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(next);
  }

  function removeChip(optionValue: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  }

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()) || (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase())))
    : options;

  const selectedLabels = useMemo(() => {
    const optMap = new Map(options.map((o) => [o.value, o]));
    return value.map((v) => optMap.get(v)).filter(Boolean) as Option[];
  }, [value, options]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const hasOptions = options.length > 0;

  return (
    <div ref={wrapperRef} className="ss-multi">
      <div
        className={cn("ss-multi__trigger", disabled && "ss-multi__trigger--disabled")}
        onClick={toggleOpen}
      >
        {selectedLabels.length > 0 ? (
          <div className="ss-multi__chips">
            {selectedLabels.map((opt) => (
              <span key={opt.value} className="ss-multi__chip">
                <span className="ss-multi__chip-label">{opt.sublabel ? `${opt.label} — ${opt.sublabel}` : opt.label}</span>
                <button
                  type="button"
                  className="ss-multi__chip-remove"
                  onClick={(e) => removeChip(opt.value, e)}
                  aria-label={`Remove ${opt.label}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="ss-multi__placeholder">{placeholder ?? "Data Contract"}</span>
        )}
        <svg className="ss-multi__arrow" width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 14a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 11.586l4.293-4.293a1 1 0 011.414 1.414l-5 5A1 1 0 0110 14z" />
        </svg>
      </div>

      {open && (
        <div className={cn("ss-multi__dropdown", flip && "ss-multi__dropdown--flip")}>
          <div className="ss-multi__search">
            <input
              ref={inputRef}
              className="ss-multi__search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter..."
            />
          </div>

          <div className="ss-multi__list">
            {!hasOptions ? (
              <div className="ss-multi__empty">{emptyLabel ?? "No options"}</div>
            ) : (
              filtered.map((option) => {
                const checked = selectedSet.has(option.value);
                return (
                  <button
                    key={option.value}
                    className={cn("ss-multi__option", checked && "ss-multi__option--selected")}
                    onClick={() => toggleOption(option.value)}
                    type="button"
                  >
                    <span className={cn("ss-multi__checkbox", checked && "ss-multi__checkbox--checked")}>
                      {checked && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 6 5 9 10 3" /></svg>}
                    </span>
                    <span className="ss-multi__option-label">
                      {option.label}
                      {option.sublabel && <span className="ss-multi__option-sublabel">{option.sublabel}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
