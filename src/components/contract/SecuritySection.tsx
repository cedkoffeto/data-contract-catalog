import type { RolePolicy } from "@/src/lib/types";

function classificationColor(classification?: string): string {
  const value = (classification ?? "").toLowerCase();
  if (["confidential", "restricted", "secret"].includes(value)) {
    return "red";
  }
  if (["internal", "sensitive"].includes(value)) {
    return "yellow";
  }
  return "green";
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
  if (!classification && containsPii === undefined && !piiNotes && roles.length === 0) {
    return null;
  }

  const color = classificationColor(classification);

  return (
    <section id="security" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Sécurité</h1>
        <p className="text-sm text-gray-500">Classification de sécurité et politiques d'accès</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            {classification ? (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Classification</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span
                    className={`inline-flex items-center rounded-md bg-${color}-50 px-2 py-1 text-xs font-medium text-${color}-700 ring-1 ring-inset ring-${color}-700/10`}
                  >
                    {classification}
                  </span>
                </dd>
              </div>
            ) : null}

            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Contient des PII</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {containsPii ? (
                  <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-700/10">
                    Oui
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                    Non
                  </span>
                )}
              </dd>
            </div>

            {piiNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes PII</dt>
                <dd className="mt-1 text-sm text-gray-900">{piiNotes}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {roles.length > 0 ? (
        <div className="mt-3 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Rôle
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Permissions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {roles.map((role, index) => (
                      <tr key={`${role.name ?? "role"}-${index}`}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {role.name}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {(role.permissions ?? []).map((permission) => (
                            <span
                              key={`${role.name}-${permission}`}
                              className="mr-1 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10"
                            >
                              {permission}
                            </span>
                          ))}
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
    </section>
  );
}
