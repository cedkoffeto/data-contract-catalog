import { InfoSection } from "@/src/components/contract/InfoSection";
import { InputsSection } from "@/src/components/contract/InputsSection";
import { LineageGraph } from "@/src/components/contract/LineageGraph";
import { ModelsSection } from "@/src/components/contract/ModelsSection";
import { QualitySection } from "@/src/components/contract/QualitySection";
import { RelationsSection } from "@/src/components/contract/RelationsSection";
import { SecuritySection } from "@/src/components/contract/SecuritySection";
import { ServiceLevelsSection } from "@/src/components/contract/ServiceLevelsSection";
import { ServingSection } from "@/src/components/contract/ServingSection";
import type { DataContract } from "@/src/lib/types";

export function ContractBody({ data, slug, userId, fieldAnnotations, onFieldClick, onAnnotationPosted, incomingRelations }: { data: DataContract; slug?: string; userId?: string; fieldAnnotations?: Record<string, number>; onFieldClick?: (fieldName: string) => void; onAnnotationPosted?: () => void; incomingRelations?: Array<{ ref_name: string; ref: string; declared_by_slug: string }> }) {
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
    <div className="mt-6 space-y-6">
      <InfoSection asset={asset} slug={slug} />

      <ModelsSection asset={asset} fields={schema.fields ?? []} grain={contract.grain} primaryKey={contract.primary_key} slug={slug} userId={userId} fieldAnnotations={fieldAnnotations} onFieldClick={onFieldClick} onAnnotationPosted={onAnnotationPosted} />

      <InputsSection
        outputName={output.table_name ?? asset.name}
        sources={inputs.sources ?? []}
        transformations={inputs.transformations ?? []}
      />

      <RelationsSection relations={schema.relations} incomingRelations={incomingRelations} />

      <LineageGraph data={data} />

      <QualitySection checks={quality.checks ?? []} onFailure={quality.on_failure} />

      <SecuritySection
        classification={security.classification}
        containsPii={security.pii?.contains_pii}
        piiNotes={security.pii?.notes}
        roles={security.access_policies?.roles ?? []}
      />

      <ServiceLevelsSection
        availability={contract.sla?.availability}
        frequency={contract.refresh?.frequency}
        maxDelayMinutes={contract.sla?.max_delay_minutes}
        readyBy={contract.sla?.ready_by}
      />

      {servingEnabled ? (
        <ServingSection
          partitioning={output.partitioning}
          retention={output.retention}
          storageFormat={output.storage_format}
          tableName={output.table_name}
          queryUrl={serving.query_url}
        />
      ) : null}
    </div>
  );
}
