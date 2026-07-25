import { useT } from "@/src/lib/use-i18n";

export function ServingSection({
  tableName,
  storageFormat,
  partitioning,
  retention,
  queryUrl
}: {
  tableName?: string;
  storageFormat?: string;
  partitioning?: string[];
  retention?: { type?: string; value?: string | number };
  queryUrl?: string;
}) {
  const { t } = useT();

  if (!tableName && !storageFormat && (!partitioning || partitioning.length === 0) && !retention && !queryUrl) {
    return null;
  }

  return (
    <section id="servers" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Serving</h1>
        <p className="text-sm text-gray-500">{t("sectionServingDesc")}</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          {tableName && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5M3.75 13.5h16.5M9 9v11.25M15 9v11.25" />
              </svg>
              <span className="font-mono text-xs font-semibold text-gray-900">{tableName}</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {t("sectionServingActive")}
              </span>
            </div>
          )}

          <div className="space-y-2">
            {storageFormat ? (
              <div className="flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50">
                <span className="shrink-0 text-xs font-semibold text-gray-500 w-32">{t("sectionServingStorageFormat")}</span>
                <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">{storageFormat}</span>
              </div>
            ) : null}

            {partitioning && partitioning.length > 0 ? (
              <div className="flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50">
                <span className="shrink-0 text-xs font-semibold text-gray-500 w-32">{t("sectionServingPartitioning")}</span>
                <span className="font-mono text-xs text-gray-900">{partitioning.join(", ")}</span>
              </div>
            ) : null}

            {retention?.type && retention.value ? (
              <div className="flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50">
                <span className="shrink-0 text-xs font-semibold text-gray-500 w-32">{t("sectionServingRetention")}</span>
                <span className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-xs font-semibold text-purple-700">
                  {String(retention.value)} ({retention.type})
                </span>
              </div>
            ) : null}
          </div>

          {queryUrl ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <a
                href={queryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-800 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {t("sectionServingOpenQuery")}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
