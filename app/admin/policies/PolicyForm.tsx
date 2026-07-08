"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { Spinner } from "@/src/components/ui/Spinner";
import { useT } from "@/src/lib/use-i18n";
import type { Group, Permission, Policy, Scope } from "./types";

function UserAutocomplete({
  value,
  onChange,
  validUsers,
}: {
  value: string;
  onChange: (v: string) => void;
  validUsers: Array<{ userId: string; email?: string | null }>;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Array<{ userId: string; email?: string | null }>>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const userIds = validUsers.map((u) => u.userId);
  const selected = validUsers.find((u) => u.userId === value);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => setUsers((data.items ?? []).slice(0, 20)))
      .catch(() => {});
    return () => ctrl.abort();
  }, [query]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const isValid = value && userIds.includes(value);

  return (
    <div ref={ref} className="relative w-full">
      <label className="mb-1 block text-xs font-medium text-gray-500" title="Required field">
        User ID <span className="text-red-500">*</span>
      </label>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm"
        style={{
          borderColor: isValid ? "#22c55e" : value && !isValid ? "#ef4444" : "#d1d5db",
          color: value ? "#111827" : "#9ca3af",
        }}
        onClick={() => setOpen(!open)}
      >
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{selected ? (selected.email ? `${selected.userId} (${selected.email})` : selected.userId) : t("searchUsers")}</span>
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 min-w-full rounded-md border bg-white shadow-lg">
          <div className="border-b border-gray-100 p-1">
            <input
              ref={searchRef}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-gray-300"
              placeholder={t("searchUsersPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-40 overflow-auto">
            {users.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{t("noMatches")}</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.userId}
                  type="button"
                  onClick={() => { onChange(u.userId); setOpen(false); }}
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ fontWeight: u.userId === value ? "600" : "400" }}
                >
                  <span className="whitespace-nowrap">{u.email ? `${u.userId} (${u.email})` : u.userId}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeDropdown({
  placeholder,
  value,
  onChange,
  options,
  disabled,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const displayOptions = ["All", ...options];
  const filtered = query
    ? displayOptions.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : displayOptions;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        style={{ borderColor: "#d1d5db" }}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${value ? "text-gray-900" : "text-gray-400"}`} title={value || undefined}>{value || placeholder}</span>
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && !disabled && (
        <div className="absolute z-10 mt-1 min-w-full rounded-md border bg-white shadow-lg">
          <div className="border-b border-gray-100 p-1">
            <input
              ref={searchRef}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-gray-300"
              placeholder={t("filter_")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-40 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{t("noMatches")}</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onChange(o === "All" ? "" : o); setOpen(false); }}
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ fontWeight: o === (value || "All") ? "600" : "400" }}
                >
                  <span className="whitespace-nowrap">{o}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DataContractSelect({
  value,
  onChange,
  domain,
  context,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  domain: string;
  context: string;
  disabled?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<{ slug: string; title: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (domain) params.set("domain", domain);
    if (context) params.set("context", context);
    const url = `/api/admin/contracts${params.toString() ? "?" + params.toString() : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => {});
  }, [domain, context]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filtered = query
    ? items.filter((s) => s.slug.toLowerCase().includes(query.toLowerCase()) || s.title.toLowerCase().includes(query.toLowerCase()))
    : items;

  const selected = items.find((s) => s.slug === value);

  return (
    <div ref={ref} className="relative w-full">
      <label className="mb-1 block text-xs font-medium text-gray-500">
        Data Contract <span className="text-gray-400">(empty = all in context)</span>
      </label>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        style={{ borderColor: "#d1d5db" }}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${value ? "text-gray-900" : "text-gray-400"}`} title={selected?.slug}>{selected ? selected.slug : (disabled ? "Admin = global access" : "e.g. credit_engagement")}</span>
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && !disabled && (
        <div className="absolute z-10 mt-1 min-w-full rounded-md border bg-white shadow-lg">
          <div className="border-b border-gray-100 p-1">
            <input
              ref={searchRef}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-gray-300"
              placeholder={t("filter_")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-40 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{t("noMatches")}</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => { onChange(s.slug); setOpen(false); }}
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ fontWeight: s.slug === value ? "600" : "400" }}
                >
                  <span className="whitespace-nowrap">{s.slug}</span>
                  {s.title && <span className="text-xs text-gray-400">{s.title}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupSelect({
  value,
  onChange,
  groups,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: Group[];
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filtered = query
    ? groups.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
    : groups;

  const selected = groups.find((g) => String(g.id) === value);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
        style={{ borderColor: value ? "#22c55e" : "#ef4444" }}
        onClick={() => setOpen(!open)}
      >
        <span className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${value ? "text-gray-900" : "text-gray-400"}`} title={selected?.name}>{selected ? selected.name : "Select a group\u2026"}</span>
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 min-w-full rounded-md border bg-white shadow-lg">
          <div className="border-b border-gray-100 p-1">
            <input
              ref={searchRef}
              className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-gray-300"
              placeholder="Filter groups..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-40 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{t("noMatches")}</p>
            ) : (
              filtered.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { onChange(String(g.id)); setOpen(false); }}
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ fontWeight: String(g.id) === value ? "600" : "400" }}
                >
                  {g.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionSelect({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: Permission[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find((p) => String(p.id) === value);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
        style={{ borderColor: value ? "#22c55e" : "#ef4444" }}
        onClick={() => setOpen(!open)}
      >
        <span>{selected ? selected.name : "Select\u2026"}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(String(p.id)); setOpen(false); }}
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              style={{ fontWeight: String(p.id) === value ? "600" : "400" }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PolicyForm({
  assignMode,
  setAssignMode,
  newUserId,
  setNewUserId,
  newGroupId,
  setNewGroupId,
  newPermissionId,
  setNewPermissionId,
  newDomainScope,
  setNewDomainScope,
  newContextScope,
  setNewContextScope,
  newDataContractScope,
  setNewDataContractScope,
  allUsers,
  groups,
  permissions,
  scopes,
  isAdmin,
  editTarget,
  saving,
  onCreate,
  onSave,
  onCancel,
}: {
  assignMode: "user" | "group";
  setAssignMode: (v: "user" | "group") => void;
  newUserId: string;
  setNewUserId: (v: string) => void;
  newGroupId: string;
  setNewGroupId: (v: string) => void;
  newPermissionId: string;
  setNewPermissionId: (v: string) => void;
  newDomainScope: string;
  setNewDomainScope: (v: string) => void;
  newContextScope: string;
  setNewContextScope: (v: string) => void;
  newDataContractScope: string;
  setNewDataContractScope: (v: string) => void;
  allUsers: Array<{ userId: string; email?: string | null }>;
  groups: Group[];
  permissions: Permission[];
  scopes: Scope[];
  isAdmin: boolean;
  editTarget: Policy | null;
  saving?: boolean;
  onCreate: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const allUserIds = allUsers.map((u) => u.userId);
  const isCreateDisabled = assignMode === "user"
    ? !allUserIds.includes(newUserId) || !newPermissionId || saving
    : !newGroupId || !newPermissionId || saving;

  const isSaveDisabled = assignMode === "user"
    ? !allUserIds.includes(newUserId) || !newPermissionId || saving
    : !newGroupId || !newPermissionId || saving;
  const { t, tWith } = useT();

  return (
    <div className="rounded-lg border bg-white p-6 mb-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {editTarget ? tWith("editPolicy", { id: String(editTarget.id) }) : t("createAccessPolicy")}
      </h2>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setAssignMode("user")}
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: assignMode === "user" ? "var(--ui-primary)" : "#f3f4f6",
            color: assignMode === "user" ? "#fff" : "#374151",
          }}
        >
          {t("forAUser")}
        </button>
        <button
          onClick={() => setAssignMode("group")}
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: assignMode === "group" ? "var(--ui-primary)" : "#f3f4f6",
            color: assignMode === "group" ? "#fff" : "#374151",
          }}
        >
          {t("forAGroup")}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {assignMode === "user" ? (
          <div className="min-w-0 grow shrink basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
            <UserAutocomplete value={newUserId} onChange={setNewUserId} validUsers={allUsers} />
          </div>
        ) : (
          <div className="min-w-0 grow shrink basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
            <label className="mb-1 block text-xs font-medium text-gray-500" title={t("requiredField")}>
              {t("groupLabel")} <span className="text-red-500">*</span>
            </label>
            <GroupSelect
              value={newGroupId}
              onChange={setNewGroupId}
              groups={groups}
            />
          </div>
        )}

        <div className="min-w-0 grow shrink basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
          <label className="mb-1 block text-xs font-medium text-gray-500" title={t("requiredField")}>
            {t("permissionLabel")} <span className="text-red-500">*</span>
          </label>
          <PermissionSelect
            value={newPermissionId}
            onChange={setNewPermissionId}
            items={permissions}
          />
        </div>

        <div className="min-w-0 grow shrink basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            {t("domain")} <span className="text-gray-400">{t("emptyAll")}</span>
          </label>
          <ScopeDropdown
            placeholder={isAdmin ? t("globalAccess") : `${t("eG")} CREDIT`}
            value={newDomainScope}
            onChange={(v) => {
              setNewDomainScope(v);
              if (v && newContextScope) {
                const validContexts = scopes.filter((s) => s.domain === v).map((s) => s.context).filter(Boolean);
                if (!validContexts.includes(newContextScope)) {
                  setNewContextScope("");
                }
              }
              if (newDataContractScope) setNewDataContractScope("");
            }}
            options={[...new Set(scopes.map((s) => s.domain).filter(Boolean))].sort()}
            disabled={isAdmin}
          />
        </div>

        <div className="min-w-0 grow shrink basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            {t("context")} <span className="text-gray-400">{t("emptyAll")}</span>
          </label>
          <ScopeDropdown
            placeholder={isAdmin ? t("globalAccess") : `${t("eG")} ENGAGEMENT`}
            value={newContextScope}
            onChange={(v) => {
              setNewContextScope(v);
              if (newDataContractScope) setNewDataContractScope("");
            }}
            options={newDomainScope ? scopes.filter((s) => s.domain === newDomainScope).map((s) => s.context).filter(Boolean) : []}
            disabled={isAdmin}
          />
        </div>

        <div className="min-w-0 grow shrink basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            {t("dataContractLabel")}
          </label>
          <DataContractSelect
            value={newDataContractScope}
            onChange={setNewDataContractScope}
            domain={newDomainScope}
            context={newContextScope}
            disabled={isAdmin}
          />
        </div>

        <div className="basis-full sm:basis-auto flex-none self-center">
          {editTarget ? (
            <div className="flex gap-2">
              <Button
                onClick={onSave}
                disabled={isSaveDisabled}
                style={{
                  backgroundColor: isSaveDisabled ? "#d1d5db" : "var(--ui-primary)",
                  color: isSaveDisabled ? "#6b7280" : "#fff",
                  cursor: isSaveDisabled ? "not-allowed" : "pointer",
                }}
                className="inline-flex items-center gap-1.5 border-0 font-bold"
              >
                {saving ? <><Spinner /> {t("savingEllipsis")}</> : t("save")}
              </Button>
              <button
                onClick={onCancel}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <Button
              onClick={onCreate}
              disabled={isCreateDisabled}
              style={{
                backgroundColor: isCreateDisabled ? "#d1d5db" : "var(--ui-primary)",
                color: isCreateDisabled ? "#6b7280" : "#fff",
                cursor: isCreateDisabled ? "not-allowed" : "pointer",
              }}
              className="inline-flex items-center gap-1.5 border-0 font-bold"
            >
              {saving ? <><Spinner /> {t("savingEllipsis")}</> : t("create")}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        {t("scopeInheritance")}
      </p>
    </div>
  );
}
