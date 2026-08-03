import { InfoSection } from "@/src/components/contract/InfoSection";
import { InputsSection } from "@/src/components/contract/InputsSection";
import { LineageGraph } from "@/src/components/contract/LineageGraph";
import { ModelsSection } from "@/src/components/contract/ModelsSection";
import { OperationsSection } from "@/src/components/contract/OperationsSection";
import { QualitySection } from "@/src/components/contract/QualitySection";
import { RelationsSection } from "@/src/components/contract/RelationsSection";
import { SecuritySection } from "@/src/components/contract/SecuritySection";
import { ServiceLevelsSection } from "@/src/components/contract/ServiceLevelsSection";
import { ServingSection } from "@/src/components/contract/ServingSection";
import React from "react";
import type { ContractField, DataContract } from "@/src/lib/types";

function computePiiLevel(fields: ContractField[]): { level: "none" | "indirect" | "direct"; hasAnnotations: boolean } {
  let level: "none" | "indirect" | "direct" = "none";
  let hasAnnotations = false;
  const visit = (list: ContractField[]) => {
    for (const f of list) {
      const c = (f.pii_classification ?? "").toLowerCase();
      if (c) {
        hasAnnotations = true;
        if (c === "direct") level = "direct";
        else if (c !== "none" && level === "none") level = "indirect";
      }
      if (f.fields && f.fields.length > 0) visit(f.fields);
    }
  };
  visit(fields);
  return { level, hasAnnotations };
}

export const ContractBody = React.memo(function ContractBody({ data, slug, userId, fieldAnnotations, onFieldClick, onAnnotationPosted, incomingRelations }: { data: DataContract; slug?: string; userId?: string; fieldAnnotations?: Record<string, number>; onFieldClick?: (fieldName: string) => void; onAnnotationPosted?: () => void; incomingRelations?: Array<{ ref_name: string; ref: string; declared_by_slug: string }> }) {
  const asset = data.asset ?? {};
  const contract = data.contract ?? {};
  const schema = contract.schema ?? {};
  const quality = data.quality ?? {};
  const security = data.security ?? {};
  const serving = data.serving ?? {};
  const output = data.output ?? {};
  const inputs = data.inputs ?? {};
  const operations = data.operations ?? {};
  const servingEnabled = serving.technology?.enabled ?? true;
  const { level: piiLevel, hasAnnotations: hasPiiAnnotations } = computePiiLevel(schema.fields ?? []);

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

      <LineageGraph data={data} slug={slug} />

      <QualitySection checks={quality.checks ?? []} onFailure={quality.on_failure} />

      <SecuritySection
        classification={security.classification}
        piiLevel={piiLevel}
        hasPiiAnnotations={hasPiiAnnotations}
        piiNotes={security.pii?.notes}
        roles={security.access_policies?.roles ?? []}
        columnMasking={security.access_policies?.column_masking}
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
          queryUrl={serving.technology?.query_url}
          location={output.location}
        />
      ) : null}

      <OperationsSection
        airflowDagId={operations.airflow_dag_id}
        scheduleCron={operations.schedule_cron}
        expectedRuntimeMinutes={operations.expected_runtime_minutes}
        alertsChannel={operations.alerts_channel}
      />
    </div>
  );
});
