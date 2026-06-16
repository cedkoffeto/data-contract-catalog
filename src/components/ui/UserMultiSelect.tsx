"use client";

import { useEffect, useRef, useState } from "react";

type UserMultiSelectProps = {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  exclude?: string[];
};

export function UserMultiSelect({
  selected,
  onChange,
  placeholder = "Search users…",
  exclude = [],
}: UserMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        const items: string[] = data.items ?? [];
        setUsers(items.filter((u) => !exclude.includes(u)));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [query, exclude]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function toggleUser(userId: string) {
    if (selected.includes(userId)) {
      onChange(selected.filter((u) => u !== userId));
    } else {
      onChange([...selected, userId]);
    }
  }

  function removeUser(userId: string) {
    onChange(selected.filter((u) => u !== userId));
  }

  const filtered = query
    ? users.filter((u) => u.toLowerCase().includes(query.toLowerCase()))
    : users;

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border bg-white px-3 py-2 text-sm cursor-text"
        style={{ borderColor: "#d1d5db" }}
        onClick={() => {
          const input = wrapperRef.current?.querySelector("input");
          if (input) input.focus();
        }}
      >
        {selected.map((userId) => (
          <span
            key={userId}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: "var(--ui-primary)", color: "#fff" }}
          >
            {userId}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeUser(userId); }}
              className="ml-0.5 leading-none hover:opacity-80"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 outline-none"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ""}
        />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-400">
              {query ? "No users match" : "No users found"}
            </div>
          ) : (
            filtered.slice(0, 50).map((userId) => {
              const isSelected = selected.includes(userId);
              return (
                <button
                  key={userId}
                  type="button"
                  onClick={() => toggleUser(userId)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="pointer-events-none"
                    checked={isSelected}
                    readOnly
                  />
                  <span className={isSelected ? "font-medium text-gray-900" : "text-gray-700"}>
                    {userId}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
