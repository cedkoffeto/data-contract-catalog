"use client";

import { useCallback, useEffect, useState } from "react";
import { t, tWith } from "@/src/lib/i18n";

import { Button } from "@/src/components/ui/Button";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/ui/Toast";
import { Spinner } from "@/src/components/ui/Spinner";

type Group = {
  id: number;
  name: string;
};

type Membership = {
  group_id: number;
  group_name: string;
  user_id: string;
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ userId: string; email?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [addTarget, setAddTarget] = useState<Group | null>(null);
  const [addUserIds, setAddUserIds] = useState<string[]>([]);
  const [membersPopoverGroup, setMembersPopoverGroup] = useState<Group | null>(null);
  const [membersFilter, setMembersFilter] = useState("");
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ group: Group; userId: string } | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const [gRes, mRes, uRes] = await Promise.all([
        fetch("/api/admin/groups"),
        fetch("/api/admin/groups/memberships"),
        fetch("/api/admin/users/search?q="),
      ]);
      setGroups((await gRes.json()).items ?? []);
      setMemberships((await mRes.json()).items ?? []);
      setAllUsers((await uRes.json()).items ?? []);
    } catch {
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (removeMemberTarget) {
          setRemoveMemberTarget(null);
        } else if (addTarget) {
          setAddTarget(null);
          setAddUserIds([]);
        } else if (membersPopoverGroup) {
          setMembersPopoverGroup(null);
          setMembersFilter("");
        }
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [removeMemberTarget, membersPopoverGroup, addTarget]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setError("");
    setCreating(true);

    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create group");
      setCreating(false);
      return;
    }

    setNewName("");
    setToast({ message: `Group "${newName.trim()}" created` });
    await fetchGroups();
    setCreating(false);
  }

  async function handleDelete(group: Group) {
    setDeleteTarget(null);
    setError("");

    const res = await fetch(`/api/admin/groups/${group.id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete group");
      return;
    }

    setToast({ message: `Group "${group.name}" deleted` });
    await fetchGroups();
  }

  async function handleRemoveMember(group: Group, userId: string) {
    setRemoveMemberTarget(null);
    setError("");

    const res = await fetch(`/api/admin/groups/${group.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to remove member");
      return;
    }

    setToast({ message: `Removed ${userId} from "${group.name}"` });
    await fetchGroups();
  }

  async function handleSaveMembers() {
    if (!addTarget) return;
    setError("");

    const currentMembers = memberships.filter((m) => m.group_id === addTarget.id).map((m) => m.user_id);
    const toAdd = addUserIds.filter((u) => !currentMembers.includes(u));
    const toRemove = currentMembers.filter((u) => !addUserIds.includes(u));

    let addOk = 0, addFail = 0, removeOk = 0, removeFail = 0;

    for (const userId of toAdd) {
      const res = await fetch(`/api/admin/groups/${addTarget.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) addOk++; else addFail++;
    }

    for (const userId of toRemove) {
      const res = await fetch(`/api/admin/groups/${addTarget.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) removeOk++; else removeFail++;
    }

    setAddTarget(null);
    setAddUserIds([]);

    const parts: string[] = [];
    if (addOk > 0) parts.push(`${addOk} added`);
    if (addFail > 0) parts.push(`${addFail} add failed`);
    if (removeOk > 0) parts.push(`${removeOk} removed`);
    if (removeFail > 0) parts.push(`${removeFail} remove failed`);

    if (parts.length > 0) {
      if (addFail === 0 && removeFail === 0) {
        setToast({ message: parts.join(", ") });
      } else {
        setError(parts.join(", "));
      }
    }

    await fetchGroups();
  }

  const filteredGroups = groups.filter((g) => {
    if (g.name.toLowerCase().includes(search.toLowerCase())) return true;
    return memberships
      .filter((m) => m.group_id === g.id)
      .some((m) => m.user_id.toLowerCase().includes(search.toLowerCase()));
  });

  const getMembers = (groupId: number) =>
    memberships.filter((m) => m.group_id === groupId);

  if (loading) {
    return (
    <div className="space-y-6 px-4 lg:px-6">
        <div className="h-28 rounded-lg border border-gray-300 bg-gray-50 shadow-lg" />
        <div className="h-64 rounded-lg border border-gray-300 bg-gray-50 shadow-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-base font-semibold text-gray-900">{t("createNewGroup")}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1" style={{ minWidth: "400px" }}>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t("groupName")}</label>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900"
              style={{ borderColor: "#d1d5db" }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim() && newName === newName.trim()) {
                  handleCreate();
                }
              }}
              placeholder={t("groupNamePlaceholder")}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={!newName.trim() || newName !== newName.trim() || creating}
            style={{
              backgroundColor: "var(--ui-primary)",
              color: "#fff",
              opacity: !newName.trim() || newName !== newName.trim() || creating ? 0.5 : 1,
              cursor: !newName.trim() || newName !== newName.trim() || creating ? "not-allowed" : "pointer",
            }}
            className="border-0 font-bold"
          >
            {creating ? <span className="inline-flex items-center gap-1.5"><Spinner /> {t("creating")}</span> : t("create")}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-3">
          <input
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("filterByGroupOrMember")}
          />
          <span className="whitespace-nowrap text-sm text-gray-400">
            {tWith("xOfYGroups", { count: String(filteredGroups.length), total: String(groups.length) })}
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-12 text-center text-sm text-gray-400 shadow-lg">
            {t("noGroupsYet")}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-12 text-center text-sm text-gray-400 shadow-lg">
            {t("noGroupsMatch")}
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t("groupNameColumn")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t("members")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t("tblActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.map((group) => {
                  const members = getMembers(group.id);
                  const visibleMembers = members.slice(0, 4);
                  const remainingCount = members.length - 4;
                  return (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="font-medium text-gray-900">{group.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {members.length === 0 ? (
                            <span className="text-sm text-gray-400">{t("noMembers")}</span>
                          ) : (
                            <>
                              {visibleMembers.map((m) => (
                                <span
                                  key={m.user_id}
                                  className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700"
                                >
                                  {m.user_id}
                                </span>
                              ))}
                              {remainingCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setMembersPopoverGroup(group)}
                                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                  {tWith("plusNMore", { count: String(remainingCount) })}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setAddTarget(group);
                              setAddUserIds(
                                allUsers.filter((u) =>
                                  memberships.some((m) => m.group_id === group.id && m.user_id === u.userId),
                                ).map((u) => u.userId),
                              );
                            }}
                            className="editor-soft-button"
                          >
                            {t("manage")}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(group)}
                            className="cursor-pointer rounded-md px-3 py-1.5 text-sm font-bold text-white"
                            style={{ backgroundColor: "#dc2626" }}
                          >
                            {t("deleteGroup")}
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
        title={t("deleteGroupTitle")}
        message={deleteTarget ? tWith("deleteGroupConfirm", { name: deleteTarget.name }) : ""}
        confirmLabel={t("yesDelete")}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {addTarget && <MemberManagerModal
        groupName={addTarget.name}
        allUsers={allUsers}
        currentMembers={memberships.filter((m) => m.group_id === addTarget.id).map((m) => m.user_id)}
        selected={addUserIds}
        onSelect={setAddUserIds}
        onSave={handleSaveMembers}
        onClose={() => { setAddTarget(null); setAddUserIds([]); }}
      />}

      {membersPopoverGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => { setMembersPopoverGroup(null); setMembersFilter(""); }}
        >
          <div
            className="flex max-h-[60vh] flex-col rounded-lg bg-white shadow-xl"
            style={{ width: "min(50vw, 600px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {tWith("membersOf", { name: membersPopoverGroup.name })}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {tWith("memberCount", { count: String(getMembers(membersPopoverGroup.id).length), s: getMembers(membersPopoverGroup.id).length !== 1 ? "s" : "" })}
                </p>
              </div>
              <button
                onClick={() => { setMembersPopoverGroup(null); setMembersFilter(""); }}
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

            <div className="border-b border-gray-100 px-4 py-2">
              <input
                className="w-full rounded border bg-white px-2 py-1.5 text-xs text-gray-900"
                style={{ borderColor: "#d1d5db" }}
                value={membersFilter}
                onChange={(e) => setMembersFilter(e.target.value)}
                placeholder={t("filterMembers")}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {(() => {
                const filtered = membersFilter
                  ? getMembers(membersPopoverGroup.id).filter((m) =>
                      m.user_id.toLowerCase().includes(membersFilter.toLowerCase()),
                    )
                  : getMembers(membersPopoverGroup.id);
                return filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    {membersFilter ? t("noMembersMatchFilter") : t("noMembers")}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filtered.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center gap-2 rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <span className="flex-1 font-mono truncate">{m.user_id}</span>
                        <button
                          onClick={() => setRemoveMemberTarget({ group: membersPopoverGroup, userId: m.user_id })}
                          className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title={tWith("removeMemberConfirm", { user: m.user_id, group: membersPopoverGroup.name })}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      <ConfirmDialog
        open={removeMemberTarget !== null}
        title={t("removeMemberTitle")}
        message={removeMemberTarget ? tWith("removeMemberConfirm", { user: removeMemberTarget.userId, group: removeMemberTarget.group.name }) : ""}
        confirmLabel={t("removeMember")}
        onConfirm={() => removeMemberTarget && handleRemoveMember(removeMemberTarget.group, removeMemberTarget.userId)}
        onCancel={() => setRemoveMemberTarget(null)}
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

function MemberManagerModal({
  groupName,
  allUsers,
  currentMembers,
  selected,
  onSelect,
  onSave,
  onClose,
}: {
  groupName: string;
  allUsers: Array<{ userId: string; email?: string | null }>;
  currentMembers: string[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? allUsers.filter((u) => u.userId.toLowerCase().includes(search.toLowerCase()))
    : allUsers;

  function toggleUser(userId: string) {
    if (selected.includes(userId)) {
      onSelect(selected.filter((u) => u !== userId));
    } else {
      onSelect([...selected, userId]);
    }
  }

  function selectAll() {
    onSelect(filtered.filter((u) => !selected.includes(u.userId)).map((u) => u.userId).concat(selected));
  }

  function deselectAll() {
    onSelect(selected.filter((u) => !filtered.map((fu) => fu.userId).includes(u)));
  }

  const added = selected.filter((u) => !currentMembers.includes(u));
  const removed = currentMembers.filter((u) => !selected.includes(u));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[60vh] flex-col rounded-lg bg-white shadow-xl"
        style={{ width: "min(50vw, 600px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {tWith("manageMembersOf", { name: groupName })}
            </h3>
            <p className="text-[11px] text-gray-400">
              {tWith("currentMembers", { count: String(currentMembers.length), s: currentMembers.length !== 1 ? "s" : "" })}
              {added.length > 0 && ` · ${tWith("toAdd", { count: String(added.length) })}`}
              {removed.length > 0 && ` · ${tWith("toRemove", { count: String(removed.length) })}`}
            </p>
          </div>
          <button
            onClick={onClose}
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

        <div className="border-b border-gray-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded border bg-white px-2 py-1.5 text-xs text-gray-900"
              style={{ borderColor: "#d1d5db" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filterUsers")}
              autoFocus
            />
            <span className="text-[11px] text-gray-400">
              {tWith("xSelected", { count: String(selected.length) })}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">
              {search ? t("noUsersMatchFilter") : t("noUsersAvailable")}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((user, index) => {
                const isSelected = selected.includes(user.userId);
                const isCurrent = currentMembers.includes(user.userId);
                return (
                    <label
                      key={`${user.userId}-${index}`}
                      className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 rounded border-gray-300"
                        checked={isSelected}
                        onChange={() => toggleUser(user.userId)}
                      />
                      <span
                        className={
                          (isCurrent && !isSelected
                            ? "font-medium text-red-700"
                            : isCurrent
                              ? "font-medium text-gray-900"
                              : isSelected
                                ? "font-medium text-green-700"
                                : "text-gray-500"
                          ) + " min-w-0 truncate"
                        }
                      >
                        {user.userId}
                        {user.email ? <span className="ml-1 text-gray-400">({user.email})</span> : null}
                      </span>
                    {isCurrent && isSelected && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        {t("memberBadge")}
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    {isCurrent && !isSelected && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        {t("toRemoveBadge")}
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    {!isCurrent && isSelected && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                        {t("newBadge")}
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
          <div className="flex gap-1.5">
            <button
              onClick={selectAll}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {t("selectAll")}
            </button>
            <button
              onClick={deselectAll}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {t("deselectAll")}
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onSave}
              disabled={added.length === 0 && removed.length === 0}
              className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--ui-primary)" }}
            >
              {added.length > 0 || removed.length > 0
                ? tWith("saveChanges", { count: String(added.length + removed.length), s: added.length + removed.length !== 1 ? "s" : "" })
                : t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
