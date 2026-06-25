"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { t } from "@/src/lib/i18n";

import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/ui/Toast";
import PolicyForm from "./PolicyForm";
import PolicyTable from "./PolicyTable";
import ConflictDialog from "./ConflictDialog";
import type { ConflictDialog as ConflictDialogType, Policy, ViewUserPolicies } from "./types";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [permissions, setPermissions] = useState<{ id: number; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [scopes, setScopes] = useState<{ domain: string; context: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Policy | null>(null);
  const [search, setSearch] = useState("");
  const [conflictDialog, setConflictDialog] = useState<ConflictDialogType | null>(null);

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
  const [allUsers, setAllUsers] = useState<Array<{ userId: string; email?: string | null }>>([]);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [viewUserPolicies, setViewUserPolicies] = useState<ViewUserPolicies | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setCurrentUserId(s?.user?.name ?? null))
      .catch(() => {});
  }, []);

  const minAdminUserId = useMemo(() => {
    const adminUserIds = policies
      .filter((p) => p.permission_name === "admin" && p.user_id)
      .map((p) => p.user_id!);
    const unique = [...new Set(adminUserIds)];
    return unique.length > 0 ? unique.sort()[0] : null;
  }, [policies]);

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
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

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
    setSaving(true);
    let conflictId: number | null = null;
    const permissionId = parseInt(newPermissionId, 10);
    if (isNaN(permissionId)) {
      setError("Permission is required");
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      permissionId,
      domainScope: newDomainScope.trim() || null,
      contextScope: newContextScope.trim() || null,
      dataContractScope: newDataContractScope.trim() || null,
    };

    if (assignMode === "user") {
      if (!newUserId.trim() || !allUsers.some((u) => u.userId === newUserId.trim())) {
        setError("User ID is required");
        setSaving(false);
        return;
      }
      body.userId = newUserId.trim();
    } else {
      const gid = parseInt(newGroupId, 10);
      if (isNaN(gid)) {
        setError("Group is required");
        setSaving(false);
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
        conflictId = data.id ?? null;
        setConflictDialog({ body, message: data.conflict.message, mode: "create", type: data.conflict.type, affectedPolicies: data.affectedPolicies ?? [], newPolicy: data.newPolicy ?? null });
      } else {
        setError(data.conflict?.message ?? "A conflicting policy already exists.");
      }
      setSaving(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create policy");
      setSaving(false);
      return;
    }

    resetForm();
    setToast({ message: "Policy created" });
    await fetchData();
    setSaving(false);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setError("");
    setSaving(true);

    const permissionId = parseInt(newPermissionId, 10);
    if (isNaN(permissionId)) {
      setError("Permission is required");
      setSaving(false);
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
      setSaving(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update policy");
      setSaving(false);
      return;
    }

    setEditTarget(null);
    setToast({ message: "Policy updated" });
    await fetchData();
    setSaving(false);
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
      resetForm();
    } else if (dialog.mode === "edit") {
      setEditTarget(null);
    }

    setToast({ message: "Policy applied" });
    await fetchData();
  }

  function resetForm() {
    setNewUserId("");
    setNewGroupId("");
    setNewPermissionId("");
    setNewDomainScope("");
    setNewContextScope("");
    setNewDataContractScope("");
    setAssignMode("user");
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <PolicyForm
        assignMode={assignMode}
        setAssignMode={setAssignMode}
        newUserId={newUserId}
        setNewUserId={setNewUserId}
        newGroupId={newGroupId}
        setNewGroupId={setNewGroupId}
        newPermissionId={newPermissionId}
        setNewPermissionId={setNewPermissionId}
        newDomainScope={newDomainScope}
        setNewDomainScope={setNewDomainScope}
        newContextScope={newContextScope}
        setNewContextScope={setNewContextScope}
        newDataContractScope={newDataContractScope}
        setNewDataContractScope={setNewDataContractScope}
        allUsers={allUsers}
        groups={groups}
        permissions={permissions}
        scopes={scopes}
        isAdmin={isAdmin}
        editTarget={editTarget}
        saving={saving}
        onCreate={handleCreate}
        onSave={handleEdit}
        onCancel={() => { setEditTarget(null); resetForm(); }}
      />

      <PolicyTable
        policies={policies}
        filteredPolicies={filteredPolicies}
        search={search}
        onSearchChange={setSearch}
        groupMap={groupMap}
        onViewUser={handleViewUser}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        currentUserId={currentUserId}
        minAdminUserId={minAdminUserId}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete policy"
        message={`Are you sure you want to delete policy #${deleteTarget}?`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {conflictDialog && (
        <ConflictDialog
          dialog={conflictDialog}
          onConfirm={handleConflictConfirm}
          onCancel={() => setConflictDialog(null)}
        />
      )}

      {viewUserPolicies && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewUserPolicies(null)} />
          <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl" style={{ width: "min(70vw, 480px)" }}>
            <h3 className="text-base font-semibold text-gray-900">
              {t("policiesForUser")} <span className="font-mono text-sm">{viewUserPolicies.userId}</span>
            </h3>

            <p className="mt-1 text-xs text-gray-400">
              {viewUserPolicies.policies.length} polic{viewUserPolicies.policies.length !== 1 ? "ies" : "y"}
            </p>

            {viewUserPolicies.loading ? (
              <p className="mt-4 text-sm text-gray-500">{t("loading")}</p>
            ) : viewUserPolicies.policies.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">{t("noPolicies")}</p>
            ) : (
              <div className="mt-3 max-h-72 overflow-y-auto">
                <div className="space-y-1">
                  {viewUserPolicies.policies.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {p.user_id ? t("direct") : t("group")}
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
                        {p.domain_scope ?? t("allDomainsScope")}{p.context_scope ? ` / ${p.context_scope}` : ""}{p.data_contract_scope ? ` / ${p.data_contract_scope}` : ""}
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
                {t("close")}
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
