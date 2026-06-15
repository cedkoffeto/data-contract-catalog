import { statusColor } from "@/src/lib/format";
import type { Asset } from "@/src/lib/types";

export function InfoSection({ asset }: { asset: Asset }) {
  const owners = asset.owners ?? {};
  const businessOwner = owners.business_owner ?? {};
  const technicalOwner = owners.technical_owner ?? {};
  const color = statusColor(asset.status);

  return (
    <section id="information">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900" id="info">
          Informations
        </h1>
        <p className="text-sm text-gray-500">Informations sur le contrat de données</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Titre</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-500/10">
                  {asset.name ?? "Unknown"}
                </span>
              </dd>
            </div>

            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Version</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  {asset.version ?? "N/A"}
                </span>
              </dd>
            </div>

            {asset.domain ? (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Domaine</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-700/10">
                    {asset.domain}
                  </span>
                </dd>
              </div>
            ) : null}

            {asset.status ? (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Statut</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span
                    className={`inline-flex items-center rounded-md bg-${color}-50 px-2 py-1 text-xs font-medium text-${color}-700 ring-1 ring-inset ring-${color}-600/10`}
                  >
                    {asset.status}
                  </span>
                </dd>
              </div>
            ) : null}

            {asset.description ? (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{asset.description}</dd>
              </div>
            ) : null}

            {businessOwner.name || businessOwner.email ? (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Propriétaire métier</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {businessOwner.name ? (
                    <span className="mr-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {businessOwner.name}
                    </span>
                  ) : null}
                  {businessOwner.email ? (
                    <a
                      href={`mailto:${businessOwner.email}`}
                      className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-700/10 hover:bg-sky-100"
                    >
                      {businessOwner.email}
                    </a>
                  ) : null}
                </dd>
              </div>
            ) : null}

            {technicalOwner.name || technicalOwner.email ? (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Propriétaire technique</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {technicalOwner.name ? (
                    <span className="mr-2 inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                      {technicalOwner.name}
                    </span>
                  ) : null}
                  {technicalOwner.email ? (
                    <a
                      href={`mailto:${technicalOwner.email}`}
                      className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-700/10 hover:bg-sky-100"
                    >
                      {technicalOwner.email}
                    </a>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}
