"use client";

import { useEffect } from "react";

import type { ConflictDialog as ConflictDialogType } from "./types";
import { t, tWith } from "@/src/lib/i18n";

export default function ConflictDialog({
  dialog,
  onConfirm,
  onCancel,
}: {
  dialog: ConflictDialogType;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 rounded-lg bg-white p-6 shadow-xl" style={{ width: "min(70vw, 850px)" }}>
        <h3 className="text-base font-semibold text-gray-900">{t("conflictTitle")}</h3>
        <p className="mt-2 text-sm text-gray-600">{dialog.message}</p>

        {dialog.newPolicy && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("newPolicyHeading")}</p>
            <table className="mt-1 w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[25%]" />
                <col className="w-[40%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="py-1 pr-4">{t("target")}</th>
                  <th className="py-1 pr-4">{t("permissionLabel")}</th>
                  <th className="py-1">{t("scope")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-gray-700">
                  <td className="py-1 pr-4 font-mono text-xs">{dialog.newPolicy.assignTo}</td>
                  <td className="py-1 pr-4">
                    <span className="rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: dialog.newPolicy.permissionName === "admin" ? "#fef2f2" : dialog.newPolicy.permissionName === "editor" ? "#fff7ed" : "#f0f9ff",
                        color: dialog.newPolicy.permissionName === "admin" ? "#dc2626" : dialog.newPolicy.permissionName === "editor" ? "#f97316" : "#2563eb",
                      }}
                    >
                      {dialog.newPolicy.permissionName}
                    </span>
                  </td>
                  <td className="py-1 text-xs">
                    {dialog.newPolicy.domainScope ?? t("allDomainsScope")}
                    {dialog.newPolicy.contextScope ? ` / ${dialog.newPolicy.contextScope}` : ""}
                    {dialog.newPolicy.dataContractScope ? ` / ${dialog.newPolicy.dataContractScope}` : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {dialog.affectedPolicies && dialog.affectedPolicies.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {tWith("policiesAffected", { count: String(dialog.affectedPolicies.length) })}
            </p>
            <table className="mt-1 w-full text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[25%]" />
                <col className="w-[40%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="py-1 pr-4">{t("target")}</th>
                  <th className="py-1 pr-4">{t("permissionLabel")}</th>
                  <th className="py-1">{t("scope")}</th>
                </tr>
              </thead>
              <tbody>
                {dialog.affectedPolicies.map((p) => (
                  <tr key={p.id} className="text-gray-700">
                    <td className="py-1 pr-4 font-mono text-xs text-gray-500">{dialog.newPolicy?.assignTo ?? ""}</td>
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
                      {p.domain_scope ?? t("allDomainsScope")}
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
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: "#dc2626" }}
          >
            {dialog.type === "broader" ? t("extendPolicy") : t("applyAnyway")}
          </button>
        </div>
      </div>
    </div>
  );
}
