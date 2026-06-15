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
            <div className="contract-models-shell">
              <table className="contract-models-table">
                <thead className="contract-models-table__head">
                  <tr>
                    <th scope="colgroup" colSpan={3} className="contract-models-table__title">
                      <span>{asset.name ?? "default"}</span>
                      <span className="contract-models-pill">
                        table
                      </span>
                      {grain ? <div className="contract-models-table__grain">{grain}</div> : null}
                    </th>
                  </tr>
                </thead>

                <ModelFieldsTable fields={fields} />

                {primaryKeyValue ? (
                  <tfoot className="contract-models-table__foot">
                    <tr>
                      <th scope="colgroup" colSpan={3} className="contract-models-table__primary-key">
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
