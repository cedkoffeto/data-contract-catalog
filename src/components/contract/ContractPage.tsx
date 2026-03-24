import { ContractHeader } from "@/src/components/contract/ContractHeader";
import { InfoSection } from "@/src/components/contract/InfoSection";
import { InputsSection } from "@/src/components/contract/InputsSection";
import { ModelsSection } from "@/src/components/contract/ModelsSection";
import { QualitySection } from "@/src/components/contract/QualitySection";
import { SecuritySection } from "@/src/components/contract/SecuritySection";
import { ServiceLevelsSection } from "@/src/components/contract/ServiceLevelsSection";
import { ServingSection } from "@/src/components/contract/ServingSection";
import { PageShell } from "@/src/components/layout/PageShell";
import type { DataContract } from "@/src/lib/types";

export function ContractPage({ data, yamlRaw }: { data: DataContract; yamlRaw: string }) {
  const asset = data.asset ?? {};
  const contract = data.contract ?? {};
  const schema = contract.schema ?? {};
  const quality = data.quality ?? {};
  const security = data.security ?? {};
  const serving = data.serving ?? {};
  const output = data.output ?? {};
  const inputs = data.inputs ?? {};

  const servingEnabled = serving.technology?.enabled ?? true;

  return (
    <PageShell footerVersion="">
      <main className="pb-7">
        <div className="mx-auto max-w-7xl pt-5 sm:px-6 lg:px-8">
          <ContractHeader asset={asset} yamlRaw={yamlRaw} />

          <div>
            <div className="mt-6 space-y-6">
              <InfoSection asset={asset} />

              <ModelsSection
                asset={asset}
                fields={schema.fields ?? []}
                primaryKey={contract.primary_key}
                grain={contract.grain}
              />

              <InputsSection sources={inputs.sources ?? []} />

              <QualitySection checks={quality.checks ?? []} onFailure={quality.on_failure} />

              <SecuritySection
                classification={security.classification}
                containsPii={security.pii?.contains_pii}
                piiNotes={security.pii?.notes}
                roles={security.access_policies?.roles ?? []}
              />

              <ServiceLevelsSection
                availability={contract.sla?.availability}
                readyBy={contract.sla?.ready_by}
                frequency={contract.refresh?.frequency}
                maxDelayMinutes={contract.sla?.max_delay_minutes}
              />

              {servingEnabled ? (
                <ServingSection
                  tableName={output.table_name}
                  storageFormat={output.storage_format}
                  partitioning={output.partitioning}
                  retention={output.retention}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
