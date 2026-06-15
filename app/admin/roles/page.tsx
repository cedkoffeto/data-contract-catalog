"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/ui/Toast";

type Role = {
  name: string;
  permissions: string;
  created_at: string;
};

const ALL_PERMISSIONS = ["read", "write", "admin"];

function parsePermissions(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["read"]);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      setRoles(data.items ?? []);
    } catch {
      setError("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setError("");

    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), permissions: newPerms }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create role");
      return;
    }

    setNewName("");
    setNewPerms(["read"]);
    setToast({ message: `Role "${newName.trim()}" created` });
    await fetchRoles();
  }

  async function handleDelete(name: string) {
    setDeleteTarget(null);
    setError("");

    const res = await fetch(`/api/admin/roles/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete role");
      return;
    }

    setToast({ message: `Role "${name}" deleted` });
    await fetchRoles();
  }

  async function togglePermission(roleName: string, perm: string) {
    const role = roles.find((r) => r.name === roleName);
    if (!role) return;

    const current = parsePermissions(role.permissions);
    const updated = current.includes(perm)
      ? current.filter((p: string) => p !== perm)
      : [...current, perm];

    const res = await fetch(`/api/admin/roles/${encodeURIComponent(roleName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: updated }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update role");
      return;
    }

    await fetchRoles();
  }

  const canCreate = newName.trim().length > 0 && newPerms.length > 0;
  const filteredRoles = roles
    .filter((r) =>
      [r.name, r.permissions, r.created_at].some((v) =>
        String(v ?? "").toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      const aVal = a[sortKey as keyof Role] ?? "";
      const bVal = b[sortKey as keyof Role] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-lg border bg-gray-50" />
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
        <h2 className="mb-4 text-base font-semibold text-gray-900">Create new role</h2>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div style={{ minWidth: "200px" }}>
              <label className="mb-1 block text-xs font-medium text-gray-500">Role name</label>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
                style={{ borderColor: "#d1d5db" }}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. viewer"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Permissions</label>
              <div className="flex gap-1">
                {ALL_PERMISSIONS.map((perm) => (
                  <label
                    key={perm}
                    className="flex cursor-pointer items-center gap-1 rounded-md border bg-white px-3 py-1 text-sm"
                    style={{
                      borderColor: newPerms.includes(perm) ? "#f97316" : undefined,
                      background: newPerms.includes(perm) ? "#fff7ed" : undefined,
                      color: newPerms.includes(perm) ? "#f97316" : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={newPerms.includes(perm)}
                      onChange={() =>
                        setNewPerms((prev) =>
                          prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
                        )
                      }
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!canCreate}
            style={{ backgroundColor: "var(--ui-primary)", color: "#fff" }}
            className="border-0 font-bold"
          >
            Create
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-3">
          <input
            className="flex-1 rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by role…"
          />
          <span className="whitespace-nowrap text-sm text-gray-400">
            {filteredRoles.length} of {roles.length} roles
          </span>
        </div>
        {roles.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
            No roles yet. Create one above.
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
            No roles match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border shadow-lg">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {(["name", "permissions", "created_at"] as const).map((key) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className="cursor-pointer select-none px-6 py-3 text-left font-medium text-gray-500 hover:text-gray-700"
                    >
                      {key === "name" ? "Role" : key === "permissions" ? "Permissions" : "Created"}
                      {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRoles.map((role) => (
                  <tr key={role.name}>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{role.name}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex gap-1">
                        {ALL_PERMISSIONS.map((perm) => {
                          const has = parsePermissions(role.permissions).includes(perm);
                          return (
                            <button
                              key={perm}
                              onClick={() => togglePermission(role.name, perm)}
                              className="rounded-md px-2 py-1 text-xs font-medium"
                              style={{
                                background: has ? "#fff7ed" : "#f9fafb",
                                color: has ? "#f97316" : "#9ca3af",
                              }}
                            >
                              {perm}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                      {new Date(role.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteTarget(role.name)}
                        className="rounded-md px-3 py-1.5 text-sm font-bold text-white"
                        style={{ backgroundColor: "#dc2626" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete role"
        message={`Are you sure you want to delete "${deleteTarget}"?`}
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
