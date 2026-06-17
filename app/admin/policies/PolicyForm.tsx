"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import type { Group, Permission, Policy, Scope } from "./types";

function UserAutocomplete({
  value,
  onChange,
  validUsers,
}: {
  value: string;
  onChange: (v: string) => void;
  validUsers: string[];
}) {
  const [query, setQuery] = useState(value);
  const [users, setUsers] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const userEdit = useRef(false);

  useEffect(() => {
    if (!userEdit.current) setQuery(value);
    userEdit.current = false;
  }, [value]);

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

  return (
    <div ref={ref} className="relative" style={{ minWidth: "200px" }}>
      <label className="mb-1 block text-xs font-medium text-gray-500" title="Required field">
        User ID <span className="text-red-500">*</span>
      </label>
      <input
        className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
        style={{
          borderColor: value && validUsers.includes(value) ? "#22c55e" : value && !validUsers.includes(value) ? "#ef4444" : "#d1d5db",
        }}
        value={query}
        onChange={(e) => {
          userEdit.current = true;
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value || !validUsers.includes(e.target.value)) {
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search users..."
      />
      {open && users.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {users.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => { userEdit.current = true; onChange(u); setQuery(u); setOpen(false); }}
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              style={{ fontWeight: u === value ? "600" : "400" }}
            >
              {u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeInput({
  domain,
  context,
  scopes,
  disabled,
  onDomainChange,
  onContextChange,
}: {
  domain: string;
  context: string;
  scopes: Scope[];
  disabled?: boolean;
  onDomainChange: (v: string) => void;
  onContextChange: (v: string) => void;
}) {
  const domainList = [...new Set(scopes.map((s) => s.domain).filter(Boolean))].sort();
  const contextList = domain
    ? scopes.filter((s) => s.domain === domain).map((s) => s.context).filter(Boolean)
    : [];

  return (
    <>
      <div style={{ minWidth: "160px" }}>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Domain <span className="text-gray-400">(empty = all)</span>
        </label>
        <input
          className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          style={{ borderColor: "#d1d5db" }}
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
          placeholder={disabled ? "Admin = global access" : "e.g. CREDIT"}
          list="domain-list"
          disabled={disabled}
        />
        <datalist id="domain-list">
          {domainList.map((d) => <option key={d} value={d} />)}
        </datalist>
      </div>
      <div style={{ minWidth: "160px" }}>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Context <span className="text-gray-400">(empty = all)</span>
        </label>
        <input
          className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          style={{ borderColor: "#d1d5db" }}
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder={disabled ? "Admin = global access" : "e.g. ENGAGEMENT"}
          list="context-list"
          disabled={disabled}
        />
        <datalist id="context-list">
          {contextList.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
    </>
  );
}

function DataContractDatalist({
  domain,
  context,
  id,
}: {
  domain: string;
  context: string;
  id: string;
}) {
  const [items, setItems] = useState<{ slug: string; title: string }[]>([]);

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

  return (
    <datalist id={id}>
      {items.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
    </datalist>
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
  allUsers: string[];
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
  const isCreateDisabled = assignMode === "user"
    ? !allUsers.includes(newUserId) || !newPermissionId || saving
    : !newGroupId || !newPermissionId || saving;

  const isSaveDisabled = assignMode === "user"
    ? !allUsers.includes(newUserId) || !newPermissionId || saving
    : !newGroupId || !newPermissionId || saving;

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        {editTarget ? `Edit policy #${editTarget.id}` : "Create access policy"}
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
          For a user
        </button>
        <button
          onClick={() => setAssignMode("group")}
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: assignMode === "group" ? "var(--ui-primary)" : "#f3f4f6",
            color: assignMode === "group" ? "#fff" : "#374151",
          }}
        >
          For a group
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {assignMode === "user" ? (
          <UserAutocomplete value={newUserId} onChange={setNewUserId} validUsers={allUsers} />
        ) : (
          <div style={{ minWidth: "200px" }}>
            <label className="mb-1 block text-xs font-medium text-gray-500" title="Required field">
              Group <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
              style={{ borderColor: newGroupId ? "#22c55e" : "#ef4444" }}
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
            >
              <option value="">Select a group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ minWidth: "140px" }}>
          <label className="mb-1 block text-xs font-medium text-gray-500" title="Required field">
            Permission <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
            style={{ borderColor: newPermissionId ? "#22c55e" : "#ef4444" }}
            value={newPermissionId}
            onChange={(e) => setNewPermissionId(e.target.value)}
          >
            <option value="">Select…</option>
            {permissions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <ScopeInput
          domain={newDomainScope}
          context={newContextScope}
          scopes={scopes}
          disabled={isAdmin}
          onDomainChange={setNewDomainScope}
          onContextChange={setNewContextScope}
        />

        <div style={{ minWidth: "200px" }}>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Data Contract <span className="text-gray-400">(empty = all in context)</span>
          </label>
          <input
            className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            style={{ borderColor: "#d1d5db" }}
            value={newDataContractScope}
            onChange={(e) => setNewDataContractScope(e.target.value)}
            placeholder={isAdmin ? "Admin = global access" : "e.g. credit_engagement"}
            list="dc-list"
            disabled={isAdmin}
          />
          <DataContractDatalist
            domain={newDomainScope}
            context={newContextScope}
            id="dc-list"
          />
        </div>

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
              className="border-0 font-bold"
            >
              Save
            </Button>
            <button
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
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
            className="border-0 font-bold"
          >
            Create
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Scope inheritance: empty/empty/empty = global access, domain only = domain-wide, domain+context = context-wide, domain+context+data contract = contract-specific.
      </p>
    </div>
  );
}
