function TableIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5M3.75 13.5h16.5M9 9v11.25M15 9v11.25" />
    </svg>
  );
}

function DiskIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

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
  if (!tableName && !storageFormat && (!partitioning || partitioning.length === 0) && !retention && !queryUrl) {
    return null;
  }

  return (
    <section id="servers" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Serving</h1>
        <p className="text-sm text-gray-500">Service et stockage des données</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="mb-4 flex items-center gap-3">
            <TableIcon />
            <span className="font-mono text-sm font-semibold text-gray-900">{tableName ?? "N/A"}</span>
            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              Actif
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {storageFormat ? (
              <div className="sm:col-span-1 flex items-center gap-2">
                <DiskIcon />
                <div>
                  <dt className="text-xs font-medium text-gray-500">Format de stockage</dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {storageFormat}
                    </span>
                  </dd>
                </div>
              </div>
            ) : null}

            {partitioning && partitioning.length > 0 ? (
              <div className="sm:col-span-1 flex items-center gap-2">
                <FolderIcon />
                <div>
                  <dt className="text-xs font-medium text-gray-500">Partitionnement</dt>
                  <dd className="mt-0.5 font-mono text-sm text-gray-900">{partitioning.join(", ")}</dd>
                </div>
              </div>
            ) : null}

            {retention?.type && retention.value ? (
              <div className="sm:col-span-1 flex items-center gap-2">
                <ClockIcon />
                <div>
                  <dt className="text-xs font-medium text-gray-500">Rétention</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">
                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                      {String(retention.value)} ({retention.type})
                    </span>
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>

          {queryUrl ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <a
                href={queryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Ouvrir dans l&apos;outil de requêtage
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
