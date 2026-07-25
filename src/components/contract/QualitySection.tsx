import type { QualityCheck } from "@/src/lib/types";
import { useT } from "@/src/lib/use-i18n";

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

export function QualitySection({
  checks,
  onFailure
}: {
  checks: QualityCheck[];
  onFailure?: { action?: string; notify?: string[] };
}) {
  if ((!checks || checks.length === 0) && !onFailure) {
    return null;
  }

  const { t, tWith } = useT();

  const total = checks.length;
  const criticalCount = checks.filter((c) => c.critical).length;
  const nonCriticalCount = total - criticalCount;

  return (
    <section id="quality" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">{t("sectionQuality")}</h1>
        <p className="text-sm text-gray-500">{t("sectionQualityDesc")}</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">

          {total > 0 && (
            <div className="mb-4 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-gray-700">
                <CheckIcon />
                {tWith("qualityChecksCount", { count: String(total) })}
              </span>
              {criticalCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {tWith("qualityCriticalsCount", { count: String(criticalCount) })}
                </span>
              )}
              {nonCriticalCount > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {tWith("qualityNonCriticalsCount", { count: String(nonCriticalCount) })}
                </span>
              )}
            </div>
          )}

          {checks.length > 0 && (
            <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th scope="col" className="py-3 pl-4 pr-2 text-left text-sm font-semibold text-gray-900 sm:pl-0 align-middle">
                        <span className="sr-only">{t("qualityCriticity")}</span>
                      </th>
                      <th scope="col" className="px-2 py-3 text-left text-sm font-semibold text-gray-900 align-middle">{t("qualityName")}</th>
                      <th scope="col" className="px-2 py-3 text-left text-sm font-semibold text-gray-900 align-middle">{t("qualityType")}</th>
                      <th scope="col" className="px-2 py-3 text-left text-sm font-semibold text-gray-900 align-middle">{t("qualityField")}</th>
                      <th scope="col" className="px-2 py-3 text-left text-sm font-semibold text-gray-900 align-middle">{t("qualityThreshold")}</th>
                      <th scope="col" className="px-2 py-3 text-left text-sm font-semibold text-gray-900 align-middle">{t("qualityExpression")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {checks.map((check, index) => {
                      const isCritical = check.critical;
                      return (
                        <tr
                          key={`${check.name ?? "check"}-${index}`}
                          className={`transition-colors hover:bg-gray-50 ${isCritical ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-400"}`}
                        >
                          <td className="whitespace-nowrap py-3 pl-4 pr-2 sm:pl-0 align-middle">
                            {isCritical ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                                </svg>
                                {t("qualityCriticalLabel")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                Non critique
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm font-medium text-gray-900 align-middle">{check.name}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 align-middle">{check.type}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 align-middle">{check.field || "-"}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-500 align-middle">{check.threshold ?? "-"}</td>
                          <td className="px-2 py-3 text-sm text-gray-500 break-words align-middle">{check.expression || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {onFailure ? (
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg border border-red-100 bg-red-50/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <span className="text-xs font-semibold text-red-700">{t("qualityOnFailure")}</span>
              </div>
              {onFailure.action ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t("qualityAction")}</span>
                  <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-900 ring-1 ring-inset ring-gray-200">
                    {onFailure.action}
                  </span>
                </div>
              ) : null}
              {onFailure.notify && onFailure.notify.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t("qualityNotifier")}</span>
                  <span className="text-xs text-gray-700">{onFailure.notify.join(", ")}</span>
                </div>
              ) : null}
            </div>
          ) : null}

        </div>
      </div>
    </section>
  );
}
