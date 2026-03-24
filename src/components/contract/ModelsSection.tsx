import { ModelFieldsTable } from "@/src/components/contract/ModelFieldsTable";
import { toArray } from "@/src/lib/format";
import type { Asset, ContractField } from "@/src/lib/types";

export function ModelsSection({
  asset,
  fields,
  primaryKey,
  grain
}: {
  asset: Asset;
  fields: ContractField[];
  primaryKey: string[] | string | undefined;
  grain?: string;
}) {
  if (!fields || fields.length === 0) {
    return null;
  }

  const primaryKeyValue = toArray(primaryKey).join(", ");

  return (
    <section id="models">
      <div className="flex justify-between">
        <div className="px-4 sm:px-0">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Modèle de données</h1>
          <p className="text-sm text-gray-500">Le modèle de données logique</p>
        </div>
      </div>

      <div className="mt-3 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="colgroup" colSpan={3} className="py-2 pl-4 pr-3 text-left font-semibold text-gray-900 sm:pl-6">
                      <span>{asset.name ?? "default"}</span>
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        table
                      </span>
                      {grain ? <div className="text-sm font-medium text-gray-500">{grain}</div> : null}
                    </th>
                  </tr>
                </thead>

                <ModelFieldsTable fields={fields} />

                {primaryKeyValue ? (
                  <tfoot className="divide-y divide-gray-200 bg-white">
                    <tr className="bg-gray-50">
                      <th scope="colgroup" colSpan={3} className="py-2 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        <span>Clé primaire : {primaryKeyValue}</span>
                      </th>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
