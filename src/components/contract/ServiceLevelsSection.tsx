function SignalIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
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

function RefreshIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75" />
    </svg>
  );
}

function HealthBadge({ value }: { value: number }) {
  const ok = value >= 99;
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
        ok ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
      }`}
    >
      {ok ? "OK" : "À surveiller"}
    </span>
  );
}

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

  const availabilityNum = typeof availability === "number" ? availability : Number(availability);

  return (
    <section id="servicelevels" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">SLA</h1>
        <p className="text-sm text-gray-500">Niveaux de service du contrat de données</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {availability ? (
              <div className="sm:col-span-1">
                <div className="flex items-center gap-1.5">
                  <SignalIcon />
                  <dt className="text-xs font-medium text-gray-500">Disponibilité</dt>
                </div>
                <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  {availability}%
                  {!Number.isNaN(availabilityNum) ? <HealthBadge value={availabilityNum} /> : null}
                </dd>
              </div>
            ) : null}

            {readyBy ? (
              <div className="sm:col-span-1">
                <div className="flex items-center gap-1.5">
                  <ClockIcon />
                  <dt className="text-xs font-medium text-gray-500">Fraîcheur</dt>
                </div>
                <dd className="mt-1 text-sm font-semibold text-gray-900">Prête à {readyBy}</dd>
              </div>
            ) : null}

            {frequency ? (
              <div className="sm:col-span-1">
                <div className="flex items-center gap-1.5">
                  <RefreshIcon />
                  <dt className="text-xs font-medium text-gray-500">Fréquence</dt>
                </div>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{frequency}</dd>
              </div>
            ) : null}

            {maxDelayMinutes ? (
              <div className="sm:col-span-1">
                <div className="flex items-center gap-1.5">
                  <TimerIcon />
                  <dt className="text-xs font-medium text-gray-500">Délai maximum</dt>
                </div>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{maxDelayMinutes} minutes</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}
