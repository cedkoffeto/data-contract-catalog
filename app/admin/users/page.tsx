"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/ui/Toast";

type UserAssignment = {
  userId: string;
  roleName: string;
  assignedBy: string;
  assignedAt: string;
  role: { name: string; permissions: string };
};

export default function UsersPage() {
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: string; roleName: string } | null>(null);
  const [sortKey, setSortKey] = useState("userId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users/assignments");
      const data = await res.json();
      setAssignments(data.items ?? []);
    } catch {
      setError("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      setRoles((data.items ?? []).map((r: { name: string }) => r.name));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchRoles();
  }, [fetchAssignments, fetchRoles]);

  async function handleAssign() {
    if (!selectedUser.trim() || !selectedRole) return;
    setError("");

    const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.trim())}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleName: selectedRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to assign role");
      return;
    }

    setSelectedUser("");
    setSelectedRole("");
    setToast({ message: `Role "${selectedRole}" assigned to "${selectedUser.trim()}"` });
    await fetchAssignments();
  }

  async function handleRevoke(userId: string, roleName: string) {
    setRevokeTarget(null);
    setError("");

    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/roles`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to revoke role");
      return;
    }

    setToast({ message: `Role "${roleName}" revoked from "${userId}"` });
    await fetchAssignments();
  }

  const filtered = assignments
    .filter((a) =>
      [a.userId, a.roleName, a.assignedBy, a.role.permissions, a.assignedAt].some((v) =>
        String(v ?? "").toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      const aVal = a[sortKey as keyof UserAssignment] ?? "";
      const bVal = b[sortKey as keyof UserAssignment] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const uniqueUsers = [...new Set(assignments.map((a) => a.userId))];
  const canAssign = selectedUser.trim().length > 0 && selectedRole.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-lg border bg-gray-50" />
        <div className="h-12 rounded-lg border bg-gray-50" />
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
        <h2 className="mb-4 text-base font-semibold text-gray-900">Assign role to user</h2>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div style={{ minWidth: "220px" }}>
              <label className="mb-1 block text-xs font-medium text-gray-500">User ID or email</label>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                placeholder="user@example.com"
                list="known-users"
              />
              <datalist id="known-users">
                {uniqueUsers.map((uid) => (
                  <option key={uid} value={uid} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Role</label>
              <select
                className="rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">Select role</option>
                {roles.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={handleAssign}
            disabled={!canAssign}
            style={{ backgroundColor: "var(--ui-primary)", color: "#fff" }}
            className="border-0 font-bold"
          >
            Assign
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-3">
          <input
            className="flex-1 rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by user…"
          />
          <span className="whitespace-nowrap text-sm text-gray-400">
            {filtered.length} of {assignments.length} assignments
          </span>
        </div>

        <div style={{ minHeight: assignments.length > 0 && filtered.length === 0 ? "250px" : undefined }}>
        {assignments.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
            No assignments yet. Assign a role above.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center text-sm text-gray-400">
            No assignments match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {(["userId", "roleName", "role", "assignedBy"] as const).map((key) => {
                    const labels: Record<string, string> = { userId: "User", roleName: "Role", role: "Permissions", assignedBy: "Assigned by" };
                    return (
                      <th
                        key={key}
                        onClick={() => key !== "role" && toggleSort(key)}
                        className={`px-4 py-2 text-left font-medium text-gray-500 ${key !== "role" ? "cursor-pointer select-none hover:text-gray-700" : ""}`}
                      >
                        {labels[key]}
                        {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                      </th>
                    );
                  })}
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((a) => (
                  <tr key={`${a.userId}-${a.roleName}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{a.userId}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className="rounded-md px-2 py-0 text-xs font-medium"
                        style={{ background: "#fff7ed", color: "#f97316" }}
                      >
                        {a.roleName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {(() => {
                        try {
                          return JSON.parse(a.role.permissions).join(", ");
                        } catch {
                          return a.role.permissions;
                        }
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{a.assignedBy}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => setRevokeTarget({ userId: a.userId, roleName: a.roleName })}
                        className="rounded-md px-3 py-1.5 text-sm font-bold text-white"
                        style={{ backgroundColor: "#dc2626" }}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revoke role"
        message={
          revokeTarget
            ? `Are you sure you want to revoke "${revokeTarget.roleName}" from "${revokeTarget.userId}"?`
            : ""
        }
        confirmLabel="Revoke"
        onConfirm={() => revokeTarget && handleRevoke(revokeTarget.userId, revokeTarget.roleName)}
        onCancel={() => setRevokeTarget(null)}
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
