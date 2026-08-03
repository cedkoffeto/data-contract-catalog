import { useT } from "@/src/lib/use-i18n";

export function OperationsSection({
  airflowDagId,
  scheduleCron,
  expectedRuntimeMinutes,
  alertsChannel,
}: {
  airflowDagId?: string;
  scheduleCron?: string;
  expectedRuntimeMinutes?: number;
  alertsChannel?: string;
}) {
  const { t } = useT();

  if (!airflowDagId && !scheduleCron && !expectedRuntimeMinutes && !alertsChannel) {
    return null;
  }

  return (
    <section id="operations" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">{t("sectionOperations")}</h1>
        <p className="text-sm text-gray-500">{t("sectionOperationsDesc")}</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {airflowDagId ? (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  {t("sectionOpsDagId")}
                </dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-gray-900">{airflowDagId}</dd>
              </div>
            ) : null}

            {scheduleCron ? (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {t("sectionOpsSchedule")}
                </dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-gray-900">{scheduleCron}</dd>
              </div>
            ) : null}

            {expectedRuntimeMinutes ? (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                  </svg>
                  {t("sectionOpsRuntime")}
                </dt>
                <dd className="mt-1 text-xs font-semibold text-gray-900">{expectedRuntimeMinutes} min</dd>
              </div>
            ) : null}

            {alertsChannel ? (
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  {t("sectionOpsAlerts")}
                </dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-gray-900">{alertsChannel}</dd>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
