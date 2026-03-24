import type { QualityCheck } from "@/src/lib/types";

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

  return (
    <section id="quality" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Qualité</h1>
        <p className="text-sm text-gray-500">Contrôles de qualité et règles de validation</p>
      </div>

      {checks.length > 0 ? (
        <div className="mt-3 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Nom
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Champ
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Seuil
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Expression
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Critique
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {checks.map((check, index) => (
                      <tr key={`${check.name ?? "check"}-${index}`}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{check.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{check.type}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{check.field || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{check.threshold ?? "-"}</td>
                        <td className="px-3 py-4 text-sm text-gray-500">{check.expression || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {check.critical ? (
                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                              Critique
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                              Non critique
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {onFailure ? (
        <div className="mt-4 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">En cas d'échec</h3>
            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              {onFailure.action ? (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Action</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-700/10">
                      {onFailure.action}
                    </span>
                  </dd>
                </div>
              ) : null}

              {onFailure.notify && onFailure.notify.length > 0 ? (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Notifier</dt>
                  <dd className="mt-1 text-sm text-gray-900">{onFailure.notify.join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}
    </section>
  );
}
