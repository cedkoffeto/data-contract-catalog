import { ContractEditorClient } from "@/src/components/editor/ContractEditorClient";
import { PageShell } from "@/src/components/layout/PageShell";
import type { DataContract, EditorRepositoryFile } from "@/src/lib/types";
import type { RJSFSchema } from "@rjsf/utils";

export function ContractEditorPage({
  data,
  initialContractSlug,
  repositoryFiles,
  schema
}: {
  data: DataContract;
  initialContractSlug?: string;
  repositoryFiles: EditorRepositoryFile[];
  schema: RJSFSchema;
}) {
  return (
    <PageShell footerVersion="V0" showFooter={false}>
      <main className="editor-page-shell">
        <ContractEditorClient
          initialContractSlug={initialContractSlug}
          initialData={data}
          repositoryFiles={repositoryFiles}
          schema={schema}
        />
      </main>
    </PageShell>
  );
}
