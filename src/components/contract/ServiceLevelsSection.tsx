export function ServiceLevelsSection({
  availability,
  readyBy,
  frequency,
  maxDelayMinutes
}: {
  availability?: string | number;
  readyBy?: string;
  frequency?: string;
  maxDelayMinutes?: number;
}) {
  if (!availability && !readyBy && !frequency && !maxDelayMinutes) {
    return null;
  }

  return (
    <section id="servicelevels" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">SLA</h1>
        <p className="text-sm text-gray-500">Niveaux de service du contrat de données</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            {availability ? (
              <div className="sm:col-span-1 flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500">Disponibilité</dt>
                <dd className="mt-0 text-sm font-semibold text-gray-900">{availability}%</dd>
              </div>
            ) : null}

            {readyBy ? (
              <div className="sm:col-span-1 flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500">Fraîcheur</dt>
                <dd className="mt-0 text-sm font-semibold text-gray-900">{readyBy}</dd>
              </div>
            ) : null}

            {frequency ? (
              <div className="sm:col-span-1 flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500">Fréquence</dt>
                <dd className="mt-0 text-sm font-semibold text-gray-900">{frequency}</dd>
              </div>
            ) : null}

            {maxDelayMinutes ? (
              <div className="sm:col-span-1 flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500">Délai maximum</dt>
                <dd className="mt-0 text-sm font-semibold text-gray-900">{maxDelayMinutes} minutes</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}
