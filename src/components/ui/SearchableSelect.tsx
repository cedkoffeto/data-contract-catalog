"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/src/lib/format";

type Option = {
  value: string;
  label: string;
  extra?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyLabel,
  includeLatest
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  includeLatest?: boolean;
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
      const trigger = wrapperRef.current?.querySelector(".ss-select__trigger");
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

  const selected = includeLatest && value === "latest"
    ? { value: "latest", label: "Current (main)" }
    : options.find((o) => o.value === value);
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.extra ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : options;

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
  }

  const hasOptions = options.length > 0;

  return (
    <div ref={wrapperRef} className="ss-select">
      <div
        className={cn("ss-select__trigger", disabled && "ss-select__trigger--disabled")}
        onClick={toggleOpen}
      >
        <span className={cn("ss-select__value", !selected && "ss-select__value--empty")}>
          {selected ? selected.label : placeholder ?? "Select..."}
        </span>
        <svg className="ss-select__arrow" width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 14a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 11.586l4.293-4.293a1 1 0 011.414 1.414l-5 5A1 1 0 0110 14z" />
        </svg>
      </div>

      {open && (
        <div className={cn("ss-select__dropdown", flip && "ss-select__dropdown--flip")}>
          <div className="ss-select__search">
            <input
              ref={inputRef}
              className="ss-select__search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter..."
            />
          </div>

          <div className="ss-select__list">
            {includeLatest ? (
              <button
                className={cn("ss-select__option", value === "latest" && "ss-select__option--selected")}
                onClick={() => handleSelect("latest")}
                type="button"
              >
                <span className="ss-select__option-label">Current (main)</span>
                {value === "latest" ? <span className="ss-select__check">✓</span> : null}
              </button>
            ) : null}

            {!hasOptions ? (
              <div className="ss-select__empty">{emptyLabel ?? "No options"}</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  className={cn("ss-select__option", value === option.value && "ss-select__option--selected")}
                  onClick={() => handleSelect(option.value)}
                  type="button"
                >
                  <div className="ss-select__option-text">
                    <span className="ss-select__option-label">{option.label}</span>
                    {option.extra ? <span className="ss-select__option-extra">{option.extra}</span> : null}
                  </div>
                  {value === option.value ? <span className="ss-select__check">✓</span> : null}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
