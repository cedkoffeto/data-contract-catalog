import type { Asset } from "@/src/lib/types";
import { useT } from "@/src/lib/use-i18n";

function VersionIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

function DescriptionIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function BusinessIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function TechnicalIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function statusClasses(status?: string) {
  const s = (status ?? "").toLowerCase();
  if (["active", "published", "production"].includes(s)) {
    return { badge: "bg-green-50 text-green-700 ring-green-600/20", border: "border-l-green-500", dot: "bg-green-500" };
  }
  if (["draft", "staging"].includes(s)) {
    return { badge: "bg-yellow-50 text-yellow-700 ring-yellow-600/20", border: "border-l-yellow-400", dot: "bg-yellow-400" };
  }
  if (["deprecated", "archived"].includes(s)) {
    return { badge: "bg-red-50 text-red-700 ring-red-600/20", border: "border-l-red-500", dot: "bg-red-500" };
  }
  return { badge: "bg-gray-50 text-gray-700 ring-gray-600/20", border: "border-l-gray-400", dot: "bg-gray-400" };
}

export function InfoSection({ asset, slug }: { asset: Asset; slug?: string }) {
  const { t } = useT();
  const owners = asset.owners ?? {};
  const businessOwner = owners.business_owner ?? {};
  const technicalOwner = owners.technical_owner ?? {};
  const sc = statusClasses(asset.status);

  return (
    <section id="information">
      <div className="px-4 sm:px-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-semibold leading-6 text-gray-900" id="info">
              {t("sectionInfo")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("sectionInfoDesc")}{slug ? <strong className="font-semibold text-orange-600"> {slug}</strong> : null}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {asset.status ? (
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${sc.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                {asset.status}
              </span>
            ) : null}
            {asset.version ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 shadow-sm">
                <VersionIcon />
                v{asset.version}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`mt-2 rounded-lg bg-white shadow sm:rounded-lg ${asset.status ? sc.border : "border-l-4 border-l-transparent"}`}
      >
        <div className="px-4 py-5 sm:px-6">
          <dl className="mt-4 flex flex-col gap-y-6">
            {asset.description ? (
              <div className="rounded-lg bg-gray-50 py-2">
                <div className="flex items-start gap-2 pl-3">
                  <DescriptionIcon />
                  <dt className="sr-only">Description</dt>
                  <dd className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 pr-3">{asset.description}</dd>
                </div>
              </div>
            ) : null}
          </dl>

          {businessOwner.name || businessOwner.email || technicalOwner.name || technicalOwner.email ? (
            <div className="mt-4 rounded-lg bg-gray-50 py-3">
              <div className="grid grid-cols-2 gap-4">
                {businessOwner.name || businessOwner.email ? (
                  <div className="flex items-center gap-2 pl-3">
                    <BusinessIcon />
                    <div>
                      <p className="text-xs font-medium text-gray-500">{t("sectionOwnerBusiness")}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 pr-3">
                        {businessOwner.name ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {businessOwner.name}
                          </span>
                        ) : null}
                        {businessOwner.email ? (
                          <a
                            href={`mailto:${businessOwner.email}`}
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-700/10 hover:bg-sky-100"
                          >
                            <MailIcon />
                            {businessOwner.email}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {technicalOwner.name || technicalOwner.email ? (
                  <div className="flex items-center gap-2 pl-3">
                    <BusinessIcon />
                    <div>
                      <p className="text-xs font-medium text-gray-500">{t("sectionOwnerTechnical")}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 pr-3">
                        {technicalOwner.name ? (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                            {technicalOwner.name}
                          </span>
                        ) : null}
                        {technicalOwner.email ? (
                          <a
                            href={`mailto:${technicalOwner.email}`}
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-700/10 hover:bg-sky-100"
                          >
                            <MailIcon />
                            {technicalOwner.email}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
