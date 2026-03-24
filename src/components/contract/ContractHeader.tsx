import { YamlDialogButton } from "@/src/components/contract/YamlDialogButton";
import type { Asset } from "@/src/lib/types";

export function ContractHeader({ asset, yamlRaw }: { asset: Asset; yamlRaw: string }) {
  const tags = asset.tags ?? [];

  return (
    <div>
      <div className="px-4 sm:px-0 md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:tracking-tight">
            Contrat de données {asset.name ?? "Unknown"}
          </h2>
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            {asset.id ?? asset.name}
            <span className="mr-1 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
              <span>{asset.version ?? "N/A"}</span>
            </span>
          </div>
          {tags.length > 0 ? (
            <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
              <div className="mt-2 flex items-center whitespace-nowrap text-sm text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="mr-1 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
                  >
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-3 lg:ml-4 lg:mt-0">
          <YamlDialogButton yamlRaw={yamlRaw} />
        </div>
      </div>
    </div>
  );
}
