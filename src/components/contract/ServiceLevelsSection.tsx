import { useT } from "@/src/lib/use-i18n";

function HealthBadge({ value }: { value: number }) {
  const { t } = useT();
  const ok = value >= 99;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
        ok ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-500" : "bg-amber-500"}`} />
      {ok ? "OK" : t("sectionSlaToWatch")}
    </span>
  );
}

function AvailabilityBar({ value }: { value: number }) {
  const ok = value >= 99;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>0%</span>
        <span>100%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${ok ? "bg-green-500" : value >= 95 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
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
  const { t, tWith } = useT();

  if (!availability && !readyBy && !frequency && !maxDelayMinutes) {
    return null;
  }

  const availabilityNum = typeof availability === "number" ? availability : Number(availability);

  return (
    <section id="servicelevels" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">SLA</h1>
        <p className="text-sm text-gray-500">{t("sectionSlaDesc")}</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          {availability ? (
            <div className="mb-5">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
                <dt className="text-xs font-semibold text-gray-500">{t("sectionSlaAvailability")}</dt>
              </div>
              <dd className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-gray-900">
                {availability}%
                {!Number.isNaN(availabilityNum) ? <HealthBadge value={availabilityNum} /> : null}
              </dd>
              {!Number.isNaN(availabilityNum) ? <AvailabilityBar value={availabilityNum} /> : null}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            {readyBy ? (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {t("sectionSlaFreshness")}
                </dt>
                <dd className="mt-1 text-xs font-semibold text-gray-900">{tWith("sectionSlaReadyBy", { readyBy })}</dd>
              </div>
            ) : null}

            {frequency ? (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                  {t("sectionSlaFrequency")}
                </dt>
                <dd className="mt-1 text-xs font-semibold text-gray-900">{frequency}</dd>
              </div>
            ) : null}

            {maxDelayMinutes ? (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75" />
                  </svg>
                  {t("sectionSlaMaxDelay")}
                </dt>
                <dd className="mt-1 text-xs font-semibold text-gray-900">{maxDelayMinutes} minutes</dd>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
