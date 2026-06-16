"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [users, setUsers] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      <label className="mb-1 block text-xs font-medium text-gray-500">User ID</label>
      <input
        className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
        style={{ borderColor: "#d1d5db" }}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search users..."
      />
      {open && users.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg">
          {users.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => { onChange(u); setQuery(u); setOpen(false); }}
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
  onDomainChange,
  onContextChange,
}: {
  domain: string;
  context: string;
  scopes: Scope[];
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
          className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
          style={{ borderColor: "#d1d5db" }}
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
          placeholder="e.g. CREDIT"
          list="domain-list"
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
          className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
          style={{ borderColor: "#d1d5db" }}
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="e.g. ENGAGEMENT"
          list="context-list"
        />
        <datalist id="context-list">
          {contextList.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
    </>
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

  const [newUserId, setNewUserId] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newPermissionId, setNewPermissionId] = useState("");
  const [newDomainScope, setNewDomainScope] = useState("");
  const [newContextScope, setNewContextScope] = useState("");

  const [assignMode, setAssignMode] = useState<"user" | "group">("user");

  const fetchData = useCallback(async () => {
    try {
      const [pRes, permRes, gRes, sRes] = await Promise.all([
        fetch("/api/admin/policies"),
        fetch("/api/admin/permissions"),
        fetch("/api/admin/groups"),
        fetch("/api/admin/scopes"),
      ]);
      setPolicies((await pRes.json()).items ?? []);
      setPermissions((await permRes.json()).items ?? []);
      setGroups((await gRes.json()).items ?? []);
      setScopes((await sRes.json()).items ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    const res = await fetch(`/api/admin/policies/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permissionId,
        domainScope: newDomainScope.trim() || null,
        contextScope: newContextScope.trim() || null,
      }),
    });

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

  function openEdit(p: Policy) {
    setEditTarget(p);
    setNewPermissionId(String(p.permission_id));
    setNewDomainScope(p.domain_scope ?? "");
    setNewContextScope(p.context_scope ?? "");
  }

  const formatScope = (domain: string | null, context: string | null) => {
    if (domain === null && context === null) return "All domains & contexts";
    if (context === null) return `Domain: ${domain}`;
    return `${domain} / ${context}`;
  };

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const filteredPolicies = policies.filter((p) => {
    const groupName = p.group_name ?? groupMap.get(p.group_id ?? -1) ?? "";
    return [String(p.id), p.user_id ?? "", String(p.group_id ?? ""), groupName, p.permission_name, p.domain_scope ?? "", p.context_scope ?? ""]
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
            <UserAutocomplete value={newUserId} onChange={setNewUserId} />
          ) : (
            <div style={{ minWidth: "200px" }}>
              <label className="mb-1 block text-xs font-medium text-gray-500">Group</label>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
                style={{ borderColor: "#d1d5db" }}
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
            <label className="mb-1 block text-xs font-medium text-gray-500">Permission</label>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
              style={{ borderColor: "#d1d5db" }}
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
            onDomainChange={setNewDomainScope}
            onContextChange={setNewContextScope}
          />

          {editTarget ? (
            <div className="flex gap-2">
              <Button
                onClick={handleEdit}
                style={{ backgroundColor: "var(--ui-primary)", color: "#fff" }}
                className="border-0 font-bold"
              >
                Save
              </Button>
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <Button
              onClick={handleCreate}
              style={{ backgroundColor: "var(--ui-primary)", color: "#fff" }}
              className="border-0 font-bold"
            >
              Create
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Scope inheritance: empty/empty = global access, domain only = domain-wide, domain+context = context-specific.
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
                        <code className="text-xs">{formatScope(p.domain_scope, p.context_scope)}</code>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                          >
                            Edit
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
