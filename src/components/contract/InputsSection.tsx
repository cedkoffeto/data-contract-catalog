import type { SourceDependency } from "@/src/lib/types";

export function InputsSection({ sources }: { sources: SourceDependency[] }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <section id="inputs" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Dépendances d'entrée</h1>
        <p className="text-sm text-gray-500">Sources d'entrée et transformations</p>
      </div>

      <div className="mt-3 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Nom de la source
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Propriétaire
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Prêt avant
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {sources.map((source, index) => (
                    <tr key={`${source.name ?? "source"}-${index}`}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        <span className="font-mono">{source.name ?? "-"}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {source.type ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {source.type}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">{source.description ?? "-"}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{source.owner ?? "-"}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {source.ready_by ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                            {source.ready_by}
                          </span>
                        ) : (
                          "-"
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
    </section>
  );
}
