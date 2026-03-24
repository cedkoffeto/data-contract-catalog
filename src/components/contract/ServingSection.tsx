export function ServingSection({
  tableName,
  storageFormat,
  partitioning,
  retention
}: {
  tableName?: string;
  storageFormat?: string;
  partitioning?: string[];
  retention?: { type?: string; value?: string | number };
}) {
  if (!tableName && !storageFormat && (!partitioning || partitioning.length === 0) && !retention) {
    return null;
  }

  return (
    <section id="servers" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Serving</h1>
        <p className="text-sm text-gray-500">Service et stockage des données</p>
      </div>
      <div className="mt-3">
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{tableName ?? "N/A"}</h3>
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Actif
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  {tableName ? (
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Nom de la table</dt>
                      <dd className="mt-1 font-mono text-sm text-gray-900">{tableName}</dd>
                    </div>
                  ) : null}

                  {storageFormat ? (
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Format de stockage</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {storageFormat}
                        </span>
                      </dd>
                    </div>
                  ) : null}

                  {partitioning && partitioning.length > 0 ? (
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Partitionnement</dt>
                      <dd className="mt-1 font-mono text-sm text-gray-900">{partitioning.join(", ")}</dd>
                    </div>
                  ) : null}

                  {retention?.type && retention.value ? (
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Rétention</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {String(retention.value)} ({retention.type})
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
