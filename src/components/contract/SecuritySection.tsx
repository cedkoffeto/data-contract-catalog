import type { RolePolicy } from "@/src/lib/types";
import { useT } from "@/src/lib/use-i18n";

function ShieldIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  );
}

function classificationBadge(classification?: string) {
  const value = (classification ?? "").toLowerCase();
  if (["confidential", "restricted", "secret"].includes(value)) {
    return {
      bg: "bg-red-50",
      text: "text-red-700",
      ring: "ring-red-600/20",
      label: classification
    };
  }
  if (["internal", "sensitive"].includes(value)) {
    return {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      ring: "ring-yellow-600/20",
      label: classification
    };
  }
  return {
    bg: "bg-green-50",
    text: "text-green-700",
    ring: "ring-green-600/20",
    label: classification
  };
}

export function SecuritySection({
  classification,
  containsPii,
  piiNotes,
  roles
}: {
  classification?: string;
  containsPii?: boolean;
  piiNotes?: string;
  roles: RolePolicy[];
}) {
  const { t } = useT();

  if (!classification && containsPii === undefined && !piiNotes && roles.length === 0) {
    return null;
  }

  const badge = classificationBadge(classification);

  return (
    <section id="security" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">{t("sectionSecurity")}</h1>
        <p className="text-sm text-gray-500">{t("sectionSecurityDesc")}</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">

          {(classification || containsPii !== undefined || piiNotes) ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {classification ? (
                <div className="sm:col-span-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldIcon />
                    <dt className="text-xs font-medium text-gray-500">{t("sectionSecurityClassification")}</dt>
                  </div>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                      {badge.label}
                    </span>
                  </dd>
                </div>
              ) : null}

              <div className="sm:col-span-1">
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                    <dt className="text-xs font-medium text-gray-500">{t("sectionSecurityPii")}</dt>
                </div>
                <dd className="mt-1">
                  {containsPii ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                      Oui
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Non
                    </span>
                  )}
                </dd>
              </div>

              {piiNotes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500">{t("sectionSecurityPiiNotes")}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{piiNotes}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {roles.length > 0 ? (
            <div className={classification || containsPii !== undefined || piiNotes ? "mt-6 border-t border-gray-100 pt-6" : ""}>
              <div className="flex items-center gap-1.5 mb-3">
                <KeyIcon />
                <h3 className="text-xs font-medium text-gray-500">{t("sectionSecurityAccessControl")}</h3>
              </div>
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th scope="col" className="pb-2 pr-3 text-left text-xs font-semibold text-gray-900">{t("sectionSecurityRole")}</th>
                    <th scope="col" className="pb-2 px-3 text-left text-xs font-semibold text-gray-900">{t("sectionSecurityPermissions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roles.map((role, index) => (
                    <tr key={`${role.name ?? "role"}-${index}`} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {role.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {(role.permissions ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(role.permissions ?? []).map((permission) => (
                              <span
                                key={`${role.name}-${permission}`}
                                className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

        </div>
      </div>
    </section>
  );
}
