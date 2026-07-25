import type { RolePolicy } from "@/src/lib/types";
import { useT } from "@/src/lib/use-i18n";

function classificationBadge(classification?: string) {
  const value = (classification ?? "").toLowerCase();
  if (["confidential", "restricted", "secret"].includes(value)) {
    return { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-600/20", icon: "text-red-500", label: classification };
  }
  if (["internal", "sensitive"].includes(value)) {
    return { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-600/20", icon: "text-amber-500", label: classification };
  }
  return { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-600/20", icon: "text-green-500", label: classification };
}

export function SecuritySection({
  classification,
  containsPii,
  piiNotes,
  roles,
  columnMasking,
}: {
  classification?: string;
  containsPii?: boolean;
  piiNotes?: string;
  roles: RolePolicy[];
  columnMasking?: Array<{ field?: string; policy?: string }>;
}) {
  const { t } = useT();

  if (!classification && containsPii === undefined && !piiNotes && roles.length === 0 && (!columnMasking || columnMasking.length === 0)) {
    return null;
  }

  const badge = classificationBadge(classification);
  const hasPii = containsPii === true;
  const hasAccessControl = roles.length > 0;

  return (
    <section id="security" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">{t("sectionSecurity")}</h1>
        <p className="text-sm text-gray-500">{t("sectionSecurityDesc")}</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">

          {(classification || containsPii !== undefined || piiNotes) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {classification ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                  <svg className={`h-3.5 w-3.5 ${badge.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  {badge.label}
                </span>
              ) : null}
              {containsPii !== undefined && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${hasPii ? "bg-amber-50 text-amber-700 ring-amber-600/20" : "bg-green-50 text-green-700 ring-green-600/20"}`}>
                  <svg className={`h-3.5 w-3.5 ${hasPii ? "text-amber-500" : "text-green-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {hasPii ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    )}
                  </svg>
                  PII: {hasPii ? "Oui" : "Non"}
                </span>
              )}
            </div>
          )}

          {piiNotes ? (
            <div className="mb-4 rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
              <svg className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{piiNotes}</span>
            </div>
          ) : null}

          {hasAccessControl && (() => {
            const allPerms = [...new Set(roles.flatMap((r) => r.permissions ?? []))].sort();
            return (
              <div className={classification || containsPii !== undefined || piiNotes ? "border-t border-gray-100 pt-4" : ""}>
                <div className="flex items-center gap-1.5 mb-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                  </svg>
                  <h3 className="text-xs font-semibold text-gray-500">{t("sectionSecurityAccessControl")}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 pr-4 text-left font-semibold text-gray-500">Rôle</th>
                        {allPerms.map((perm) => (
                          <th key={perm} className="pb-2 px-3 text-center font-semibold text-gray-500">{perm}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {roles.map((role, index) => {
                        const rolePerms = new Set(role.permissions ?? []);
                        return (
                          <tr key={`${role.name ?? "role"}-${index}`} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 pr-4">
                              <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                                {role.name}
                              </span>
                            </td>
                            {allPerms.map((perm) => (
                              <td key={perm} className="py-2 px-3 text-center">
                                {rolePerms.has(perm) ? (
                                  <svg className="mx-auto h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                ) : (
                                  <span className="inline-block h-4 w-4 text-gray-200">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {columnMasking && columnMasking.length > 0 && (() => {
            const prevContent = classification || containsPii !== undefined || piiNotes || roles.length > 0;
            return (
              <div className={prevContent ? "border-t border-gray-100 pt-4 mt-4" : ""}>
                <div className="flex items-center gap-1.5 mb-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <h3 className="text-xs font-semibold text-gray-500">{t("sectionSecurityColumnMasking")}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 pr-4 text-left font-semibold text-gray-500">{t("sectionSecurityField")}</th>
                        <th className="pb-2 text-left font-semibold text-gray-500">{t("sectionSecurityPolicy")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {columnMasking.map((entry, i) => (
                        <tr key={`mask-${i}`} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2 pr-4">
                            <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-700">
                              {entry.field}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                              {entry.policy}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </section>
  );
}
