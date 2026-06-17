"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/ui/Toast";

type Policy = {
  id: number;
  user_id: string | null;
  group_id: number | null;
  group_name: string | null;
  permission_id: number;
  permission_name: string;
  domain_scope: string | null;
  context_scope: string | null;
  data_contract_scope: string | null;
};

type Permission = {
  id: number;
  name: string;
};

type Group = {
  id: number;
  name: string;
};

type Scope = {
  domain: string;
  context: string;
};

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

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 3.5c4.08 0 7.47 2.9 8.23 6.75-.76 3.85-4.15 6.75-8.23 6.75s-7.47-2.9-8.23-6.75C2.53 6.4 5.92 3.5 10 3.5zm0 2C7.22 5.5 4.82 7.35 3.9 10c.92 2.65 3.32 4.5 6.1 4.5s5.18-1.85 6.1-4.5c-.92-2.65-3.32-4.5-6.1-4.5zm0 1.75A2.75 2.75 0 1110 12.75 2.75 2.75 0 0110 7.25z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13.586 2.586a2 2 0 012.828 0l.828.828a2 2 0 010 2.828l-9.172 9.172a2 2 0 01-1.068.566l-3.11.518a1 1 0 01-1.112-1.112l.518-3.11a2 2 0 01.566-1.068l9.172-9.172zM15.414 4.414a.5.5 0 00-.707 0l-1.06 1.06 1.768 1.768 1.06-1.06a.5.5 0 000-.707l-.828-.828z" />
    </svg>
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

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Policy | null>(null);
  const [search, setSearch] = useState("");
  const [conflictDialog, setConflictDialog] = useState<{
    body: Record<string, unknown>;
    message: string;
    mode: "create" | "edit";
    type: string;
    affectedPolicies?: Array<{ id: number; domain_scope: string | null; context_scope: string | null; data_contract_scope: string | null; permission_name: string }>;
    newPolicy?: { assignTo: string; permissionName: string; domainScope: string | null; contextScope: string | null; dataContractScope?: string | null } | null;
  } | null>(null);

  const [newUserId, setNewUserId] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newPermissionId, setNewPermissionId] = useState("");
  const [newDomainScope, setNewDomainScope] = useState("");
  const [newContextScope, setNewContextScope] = useState("");
  const [newDataContractScope, setNewDataContractScope] = useState("");

  const adminPermissionId = useMemo(
    () => permissions.find((p) => p.name === "admin")?.id ?? null,
    [permissions],
  );
  const isAdmin = adminPermissionId !== null && parseInt(newPermissionId, 10) === adminPermissionId;

  useEffect(() => {
    if (isAdmin) {
      setNewDomainScope("");
      setNewContextScope("");
      setNewDataContractScope("");
    }
  }, [isAdmin]);

  const [assignMode, setAssignMode] = useState<"user" | "group">("user");
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [viewUserPolicies, setViewUserPolicies] = useState<{
    userId: string;
    policies: Policy[];
    loading: boolean;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, permRes, gRes, sRes, uRes] = await Promise.all([
        fetch("/api/admin/policies"),
        fetch("/api/admin/permissions"),
        fetch("/api/admin/groups"),
        fetch("/api/admin/scopes"),
        fetch("/api/admin/users/search?q="),
      ]);
      setPolicies((await pRes.json()).items ?? []);
      setPermissions((await permRes.json()).items ?? []);
      setGroups((await gRes.json()).items ?? []);
      setScopes((await sRes.json()).items ?? []);
      setAllUsers((await uRes.json()).items ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && viewUserPolicies) {
        setViewUserPolicies(null);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [viewUserPolicies]);

  async function handleCreate() {
    setError("");

    const permissionId = parseInt(newPermissionId, 10);
    if (isNaN(permissionId)) {
      setError("Permission is required");
      return;
    }

    const body: Record<string, unknown> = {
      permissionId,
      domainScope: newDomainScope.trim() || null,
      contextScope: newContextScope.trim() || null,
      dataContractScope: newDataContractScope.trim() || null,
    };

    if (assignMode === "user") {
      if (!newUserId.trim()) {
        setError("User ID is required");
        return;
      }
      body.userId = newUserId.trim();
    } else {
      const gid = parseInt(newGroupId, 10);
      if (isNaN(gid)) {
        setError("Group is required");
        return;
      }
      body.groupId = gid;
    }

    const res = await fetch("/api/admin/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      const data = await res.json();
      if (data.conflict?.type === "overlap" || data.conflict?.type === "broader") {
        setConflictDialog({ body, message: data.conflict.message, mode: "create", type: data.conflict.type, affectedPolicies: data.affectedPolicies ?? [], newPolicy: data.newPolicy ?? null });
      } else {
        setError(data.conflict?.message ?? "A conflicting policy already exists.");
      }
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create policy");
      return;
    }

    setNewUserId("");
    setNewGroupId("");
    setNewPermissionId("");
    setNewDomainScope("");
    setNewContextScope("");
    setNewDataContractScope("");
    setToast({ message: "Policy created" });
    await fetchData();
  }

  async function handleEdit() {
    if (!editTarget) return;
    setError("");

    const permissionId = parseInt(newPermissionId, 10);
    if (isNaN(permissionId)) {
      setError("Permission is required");
      return;
    }

    const body: Record<string, unknown> = {
      permissionId,
      domainScope: newDomainScope.trim() || null,
      contextScope: newContextScope.trim() || null,
      dataContractScope: newDataContractScope.trim() || null,
    };

    const res = await fetch(`/api/admin/policies/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      const data = await res.json();
      if (data.conflict?.type === "overlap" || data.conflict?.type === "broader") {
        setConflictDialog({ body, message: data.conflict.message, mode: "edit", type: data.conflict.type, affectedPolicies: data.affectedPolicies ?? [], newPolicy: data.newPolicy ?? null });
      } else {
        setError(data.conflict?.message ?? "A conflicting policy already exists.");
      }
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update policy");
      return;
    }

    setEditTarget(null);
    setToast({ message: "Policy updated" });
    await fetchData();
  }

  async function handleDelete(id: number) {
    setDeleteTarget(null);
    setError("");

    const res = await fetch(`/api/admin/policies/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete policy");
      return;
    }

    setToast({ message: `Policy #${id} deleted` });
    await fetchData();
  }

  async function handleViewUser(userId: string) {
    setViewUserPolicies({ userId, policies: [], loading: true });
    try {
      const res = await fetch(`/api/admin/policies/effective?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setViewUserPolicies({ userId, policies: data.items, loading: false });
    } catch {
      setViewUserPolicies(null);
      setError("Failed to load user policies");
    }
  }

  async function handleConflictConfirm() {
    const dialog = conflictDialog;
    if (!dialog) return;
    setConflictDialog(null);

    const body = { ...dialog.body, force: true };

    const url = dialog.mode === "edit" && editTarget
      ? `/api/admin/policies/${editTarget.id}`
      : "/api/admin/policies";

    const method = dialog.mode === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to apply policy");
      return;
    }

    if (dialog.mode === "create") {
      setNewUserId("");
      setNewGroupId("");
      setNewPermissionId("");
      setNewDomainScope("");
      setNewContextScope("");
      setNewDataContractScope("");
    } else if (dialog.mode === "edit") {
      setEditTarget(null);
    }

    setToast({ message: "Policy applied" });
    await fetchData();
  }

  function openEdit(p: Policy) {
    setEditTarget(p);
    setAssignMode(p.user_id ? "user" : "group");
    setNewUserId(p.user_id ?? "");
    setNewGroupId(String(p.group_id ?? ""));
    setNewPermissionId(String(p.permission_id));
    setNewDomainScope(p.domain_scope ?? "");
    setNewContextScope(p.context_scope ?? "");
    setNewDataContractScope(p.data_contract_scope ?? "");
  }

  const formatScope = (domain: string | null, context: string | null, dataContract?: string | null) => {
    if (domain === null && context === null && !dataContract) return "All domains & contexts";
    if (context === null && !dataContract) return `Domain: ${domain}`;
    if (dataContract) return `${domain} / ${context} / ${dataContract}`;
    return `${domain} / ${context}`;
  };

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const filteredPolicies = policies.filter((p) => {
    const groupName = p.group_name ?? groupMap.get(p.group_id ?? -1) ?? "";
    return [String(p.id), p.user_id ?? "", String(p.group_id ?? ""), groupName, p.permission_name, p.domain_scope ?? "", p.context_scope ?? "", p.data_contract_scope ?? ""]
      .some((v) => v.toLowerCase().includes(search.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 rounded-lg border bg-gray-50" />
        <div className="h-64 rounded-lg border bg-gray-50" />
      </div>
    );
  }

  const isCreateDisabled = assignMode === "user"
    ? !allUsers.includes(newUserId) || !newPermissionId
    : !newGroupId || !newPermissionId;

  const isSaveDisabled = assignMode === "user"
    ? !allUsers.includes(newUserId) || !newPermissionId
    : !newGroupId || !newPermissionId;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
                onClick={handleEdit}
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
                onClick={() => {
                  setEditTarget(null);
                  setNewUserId("");
                  setNewGroupId("");
                  setNewPermissionId("");
                  setNewDomainScope("");
                  setNewContextScope("");
                  setNewDataContractScope("");
                  setAssignMode("user");
                }}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <Button
              onClick={handleCreate}
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

      <div>
        <div className="mb-3 flex items-center gap-3">
          <input
            className="flex-1 rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter policies…"
          />
          <span className="whitespace-nowrap text-sm text-gray-400">
            {filteredPolicies.length} of {policies.length} policies
          </span>
        </div>

        {policies.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
            No policies yet. Create one above.
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
            No policies match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border shadow-lg">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {(["id", "target", "permission_name", "scope"] as const).map((key) => {
                    const labels: Record<string, string> = { id: "ID", target: "Target", permission_name: "Permission", scope: "Scope" };
                    return (
                      <th key={key} className="px-6 py-3 text-left font-medium text-gray-500">
                        {labels[key]}
                      </th>
                    );
                  })}
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPolicies.map((p) => {
                  const groupName = p.group_name ?? groupMap.get(p.group_id ?? -1) ?? "";
                  return (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">{p.id}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {p.user_id ? (
                          <span>
                            <span className="text-xs text-gray-400">user:</span>{" "}
                            <span className="font-medium text-gray-900">{p.user_id}</span>
                          </span>
                        ) : (
                          <span>
                            <span className="text-xs text-gray-400">group:</span>{" "}
                            <span className="font-medium text-gray-900">{groupName || `#${p.group_id}`}</span>
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: p.permission_name === "admin" ? "#fef2f2" : p.permission_name === "editor" ? "#fff7ed" : "#f0f9ff",
                            color: p.permission_name === "admin" ? "#dc2626" : p.permission_name === "editor" ? "#f97316" : "#2563eb",
                          }}
                        >
                          {p.permission_name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        <code className="text-xs">{formatScope(p.domain_scope, p.context_scope, p.data_contract_scope)}</code>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.user_id && (
                            <button
                              onClick={() => handleViewUser(p.user_id!)}
                              className="editor-soft-button"
                            >
                              <EyeIcon />
                              <span className="ml-1.5">View</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(p)}
                            className="editor-soft-button"
                          >
                            <PencilIcon />
                            <span className="ml-1.5">Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p.id)}
                            className="rounded-md px-3 py-1.5 text-sm font-bold text-white"
                            style={{ backgroundColor: "#dc2626" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete policy"
        message={`Are you sure you want to delete policy #${deleteTarget}?`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {conflictDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConflictDialog(null)} />
          <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl" style={{ width: "min(70vw, 850px)" }}>
            <h3 className="text-base font-semibold text-gray-900">Conflicting policy</h3>
            <p className="mt-2 text-sm text-gray-600">{conflictDialog.message}</p>

            {conflictDialog.newPolicy && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">New policy</p>
                <table className="mt-1 w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[25%]" />
                    <col className="w-[40%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="py-1 pr-4">Target</th>
                      <th className="py-1 pr-4">Permission</th>
                      <th className="py-1">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-gray-700">
                      <td className="py-1 pr-4 font-mono text-xs">{conflictDialog.newPolicy.assignTo}</td>
                      <td className="py-1 pr-4">
                        <span className="rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: conflictDialog.newPolicy.permissionName === "admin" ? "#fef2f2" : conflictDialog.newPolicy.permissionName === "editor" ? "#fff7ed" : "#f0f9ff",
                            color: conflictDialog.newPolicy.permissionName === "admin" ? "#dc2626" : conflictDialog.newPolicy.permissionName === "editor" ? "#f97316" : "#2563eb",
                          }}
                        >
                          {conflictDialog.newPolicy.permissionName}
                        </span>
                      </td>
                      <td className="py-1 text-xs">
                        {conflictDialog.newPolicy.domainScope ?? "all domains"}
                        {conflictDialog.newPolicy.contextScope ? ` / ${conflictDialog.newPolicy.contextScope}` : ""}
                        {conflictDialog.newPolicy.dataContractScope ? ` / ${conflictDialog.newPolicy.dataContractScope}` : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {conflictDialog.affectedPolicies && conflictDialog.affectedPolicies.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Existing policies affected ({conflictDialog.affectedPolicies.length})
                </p>
                <table className="mt-1 w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col className="w-[35%]" />
                    <col className="w-[25%]" />
                    <col className="w-[40%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="py-1 pr-4">Target</th>
                      <th className="py-1 pr-4">Permission</th>
                      <th className="py-1">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflictDialog.affectedPolicies.map((p) => (
                      <tr key={p.id} className="text-gray-700">
                        <td className="py-1 pr-4 font-mono text-xs text-gray-500">{conflictDialog.newPolicy?.assignTo ?? ""}</td>
                        <td className="py-1 pr-4">
                          <span className="rounded-md px-2 py-0.5 text-xs font-medium"
                            style={{
                              background: p.permission_name === "admin" ? "#fef2f2" : p.permission_name === "editor" ? "#fff7ed" : "#f0f9ff",
                              color: p.permission_name === "admin" ? "#dc2626" : p.permission_name === "editor" ? "#f97316" : "#2563eb",
                            }}
                          >
                            {p.permission_name}
                          </span>
                        </td>
                        <td className="py-1 text-xs">
                          {p.domain_scope ?? "all domains"}
                          {p.context_scope ? ` / ${p.context_scope}` : ""}
                          {p.data_contract_scope ? ` / ${p.data_contract_scope}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConflictDialog(null)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConflictConfirm}
                className="rounded-md px-4 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: "#dc2626" }}
              >
                {conflictDialog.type === "broader" ? "Extend policy" : "Apply anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewUserPolicies && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewUserPolicies(null)} />
          <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl" style={{ width: "min(70vw, 480px)" }}>
            <h3 className="text-base font-semibold text-gray-900">
              Policies for user: <span className="font-mono text-sm">{viewUserPolicies.userId}</span>
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              {viewUserPolicies.policies.length} polic{viewUserPolicies.policies.length !== 1 ? "ies" : "y"}
            </p>

            {viewUserPolicies.loading ? (
              <p className="mt-4 text-sm text-gray-500">Loading...</p>
            ) : viewUserPolicies.policies.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No policies found for this user.</p>
            ) : (
              <div className="mt-3 max-h-72 overflow-y-auto">
                <div className="space-y-1">
                  {viewUserPolicies.policies.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {p.user_id ? "direct" : `group`}
                      </span>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: p.permission_name === "admin" ? "#fef2f2" : p.permission_name === "editor" ? "#fff7ed" : "#f0f9ff",
                          color: p.permission_name === "admin" ? "#dc2626" : p.permission_name === "editor" ? "#f97316" : "#2563eb",
                        }}
                      >
                        {p.permission_name}
                      </span>
                      <span className="font-mono text-xs text-gray-500">
                        {p.domain_scope ?? "all domains"}{p.context_scope ? ` / ${p.context_scope}` : ""}{p.data_contract_scope ? ` / ${p.data_contract_scope}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewUserPolicies(null)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
