"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t, tWith } from "@/src/lib/i18n";

import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/ui/Toast";
import PolicyForm from "./PolicyForm";
import PolicyTable from "./PolicyTable";
import ConflictDialog from "./ConflictDialog";
import type { ConflictDialog as ConflictDialogType, Policy, ViewGroupMembers, ViewUserPolicies } from "./types";

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const data = await res.json();
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getConflictInfo(data: Record<string, unknown> | null) {
  if (!data) return null;
  const conflict = data.conflict as Record<string, unknown> | undefined;
  if (!conflict) return null;
  return {
    type: conflict.type as string,
    message: conflict.message as string,
    affectedPolicies: (data.affectedPolicies ?? []) as Array<unknown>,
    newPolicy: data.newPolicy ?? null,
    id: data.id ?? null,
  };
}

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
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
  const [saving, setSaving] = useState(false);
  const [viewUserPolicies, setViewUserPolicies] = useState<ViewUserPolicies | null>(null);
  const [viewGroupMembers, setViewGroupMembers] = useState<ViewGroupMembers | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const minAdminUserId = useMemo(() => {
    const adminUserIds = policies
      .filter((p) => p.permission_name === "admin" && p.user_id)
      .map((p) => p.user_id ?? "");
    const unique = [...new Set(adminUserIds)];
    return unique.length > 0 ? unique.sort()[0] : null;
  }, [policies]);

  const fetchData = useCallback(async () => {
    try {
      const [sessionRes, pRes, permRes, gRes, sRes, uRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/admin/policies"),
        fetch("/api/admin/permissions"),
        fetch("/api/admin/groups"),
        fetch("/api/admin/scopes"),
        fetch("/api/admin/users/search?q="),
      ]);
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setCurrentUserId(session?.user?.name ?? null);
      }
      setPolicies(pRes.ok ? (await pRes.json()).items ?? [] : []);
      setPermissions(permRes.ok ? (await permRes.json()).items ?? [] : []);
      setGroups(gRes.ok ? (await gRes.json()).items ?? [] : []);
      setScopes(sRes.ok ? (await sRes.json()).items ?? [] : []);
      setAllUsers(uRes.ok ? (await uRes.json()).items ?? [] : []);
    } catch {
      setError(t("failedToLoadData"));
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
    const permissionId = parseInt(newPermissionId, 10);
    if (isNaN(permissionId)) {
      setError(t("permissionRequired"));
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
        setError(t("userIdRequired"));
        setSaving(false);
        return;
      }
      body.userId = newUserId.trim();
    } else {
      const gid = parseInt(newGroupId, 10);
      if (isNaN(gid)) {
        setError(t("groupIdRequired"));
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
      const data = await safeJson(res);
      const info = getConflictInfo(data);
      if (info && (info.type === "overlap" || info.type === "broader")) {
        setConflictDialog({ body, message: info.message, mode: "create", type: info.type, affectedPolicies: info.affectedPolicies as ConflictDialogType["affectedPolicies"], newPolicy: info.newPolicy as ConflictDialogType["newPolicy"] });
      } else {
        setError((data?.conflict as Record<string, unknown>)?.message as string ?? t("conflictingPolicy"));
      }
      setSaving(false);
      return;
    }

    if (!res.ok) {
      const data = await safeJson(res);
      setError(String(data?.error ?? t("failedToCreatePolicy")));
      setSaving(false);
      return;
    }

    resetForm();
    setToast({ message: t("policyCreated") });
    await fetchData();
    setSaving(false);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setError("");
    setSaving(true);

    const permissionId = parseInt(newPermissionId, 10);
    if (isNaN(permissionId)) {
      setError(t("permissionRequired"));
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
      const data = await safeJson(res);
      const info = getConflictInfo(data);
      if (info && (info.type === "overlap" || info.type === "broader")) {
        setConflictDialog({ body, message: info.message, mode: "edit", type: info.type, affectedPolicies: info.affectedPolicies as ConflictDialogType["affectedPolicies"], newPolicy: info.newPolicy as ConflictDialogType["newPolicy"] });
      } else {
        setError((data?.conflict as Record<string, unknown>)?.message as string ?? t("conflictingPolicy"));
      }
      setSaving(false);
      return;
    }

    if (!res.ok) {
      const data = await safeJson(res);
      setError(String(data?.error ?? t("failedToUpdatePolicy")));
      setSaving(false);
      return;
    }

    setEditTarget(null);
    setEditingId(null);
    setToast({ message: t("policyUpdated") });
    await fetchData();
    setSaving(false);
  }

  async function handleDelete(id: number) {
    setDeleteTarget(null);
    setError("");

    const res = await fetch(`/api/admin/policies/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await safeJson(res);
      setError(String(data?.error ?? t("failedToDeletePolicy")));
      return;
    }

    setToast({ message: tWith("policyDeleted", { id: String(id) }) });
    await fetchData();
  }

  async function handleViewGroupMembers(groupId: number, groupName: string) {
    setViewGroupMembers({ groupId, groupName, members: [], loading: true });
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/members`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setViewGroupMembers({ groupId, groupName, members: data.members, loading: false });
    } catch {
      setViewGroupMembers(null);
      setError(t("failedToLoadGroupMembers"));
    }
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
      setError(t("failedToLoadUserPolicies"));
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
      setError(data.error ?? t("failedToApplyPolicy"));
      return;
    }

    if (dialog.mode === "create") {
      resetForm();
    } else if (dialog.mode === "edit") {
      setEditTarget(null);
    }

    setToast({ message: t("policyApplied") });
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
    setEditingId(p.id);
    setAssignMode(p.user_id ? "user" : "group");
    setNewUserId(p.user_id ?? "");
    setNewGroupId(String(p.group_id ?? ""));
    setNewPermissionId(String(p.permission_id));
    setNewDomainScope(p.domain_scope ?? "");
    setNewContextScope(p.context_scope ?? "");
    setNewDataContractScope(p.data_contract_scope ?? "");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setEditingId(null), 2500);
  }

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const filteredPolicies = policies.filter((p) => {
    const groupName = p.group_name ?? groupMap.get(p.group_id ?? -1) ?? "";
    return [String(p.id), p.user_id ?? "", String(p.group_id ?? ""), groupName, p.permission_name, p.domain_scope ?? "", p.context_scope ?? "", p.data_contract_scope ?? ""]
      .some((v) => v.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="w-full space-y-6 px-4 lg:px-6">
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div
        ref={formRef}
        className={`rounded-lg transition-shadow duration-300 ${editingId !== null ? "shadow-[0_0_0_2px_#3b82f6,0_0_0_6px_rgba(59,130,246,0.15)]" : ""}`}
      >
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
          onCancel={() => { setEditTarget(null); setEditingId(null); resetForm(); }}
        />
      </div>

      <h2 className="text-lg font-semibold text-gray-900">{t("accessPolicies")}</h2>

      {loading ? (
        <div className="skeleton-pulse h-64 w-full rounded-lg" />
      ) : (
        <PolicyTable
          policies={policies}
          filteredPolicies={filteredPolicies}
          search={search}
          onSearchChange={setSearch}
          groupMap={groupMap}
          onViewUser={handleViewUser}
          onViewGroupMembers={handleViewGroupMembers}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          currentUserId={currentUserId}
          minAdminUserId={minAdminUserId}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("deletePolicy")}
        message={tWith("deletePolicyConfirm", { id: String(deleteTarget) })}
        confirmLabel={t("yesDelete")}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setViewUserPolicies(null)}
        >
          <div
            className="flex max-h-[80vh] flex-col rounded-lg bg-white shadow-xl"
            style={{ width: "min(70vw, 900px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t("policiesForUser")} <span className="font-mono">{viewUserPolicies.userId}</span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  {tWith(viewUserPolicies.policies.length === 1 ? "policyCountOne" : "policyCountMany", { count: String(viewUserPolicies.policies.length) })}
                </p>
              </div>
              <button
                onClick={() => setViewUserPolicies(null)}
                className="editor-close-button"
                aria-label={t("close")}
                title={t("close")}
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {viewUserPolicies.loading ? (
              <div className="flex-1 px-4 py-8 text-center text-sm text-gray-400">{t("loading")}</div>
            ) : viewUserPolicies.policies.length === 0 ? (
              <div className="flex-1 px-4 py-8 text-center text-sm text-gray-400">{t("noPolicies")}</div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <div className="space-y-1">
                  {viewUserPolicies.policies.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {p.user_id ? t("direct") : t("group")}
                      </span>
                      <span
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: p.permission_name === "admin" ? "#fef2f2" : p.permission_name === "editor" ? "#fff7ed" : "#f0f9ff",
                          color: p.permission_name === "admin" ? "#dc2626" : p.permission_name === "editor" ? "#f97316" : "#2563eb",
                        }}
                      >
                        {p.permission_name}
                      </span>
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-gray-500">
                        {p.domain_scope ?? t("allDomainsScope")}{p.context_scope ? ` / ${p.context_scope}` : ""}{p.data_contract_scope ? ` / ${p.data_contract_scope}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewGroupMembers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setViewGroupMembers(null)}
        >
          <div
            className="flex max-h-[60vh] flex-col rounded-lg bg-white shadow-xl"
            style={{ width: "min(50vw, 600px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {tWith("membersOf", { name: viewGroupMembers.groupName })}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {tWith("memberCount", { count: String(viewGroupMembers.members.length), s: viewGroupMembers.members.length !== 1 ? "s" : "" })}
                </p>
              </div>
              <button
                onClick={() => setViewGroupMembers(null)}
                className="editor-close-button"
                aria-label={t("close")}
                title={t("close")}
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5.5 5.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {viewGroupMembers.loading ? (
              <div className="flex-1 px-4 py-8 text-center text-sm text-gray-400">{t("loading")}</div>
            ) : viewGroupMembers.members.length === 0 ? (
              <div className="flex-1 px-4 py-8 text-center text-sm text-gray-400">{t("noMembers")}</div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <div className="space-y-0.5">
                  {viewGroupMembers.members.map((userId) => (
                    <div
                      key={userId}
                      className="flex items-center gap-2 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <span className="flex-1 font-mono truncate">{userId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
