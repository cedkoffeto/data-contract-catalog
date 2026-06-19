import dynamic from "next/dynamic";
import { PageShell } from "@/src/components/layout/PageShell";
import type { DataContract, EditorRepositoryFile } from "@/src/lib/types";
import type { RJSFSchema } from "@rjsf/utils";

const ContractEditorClient = dynamic(
  () => import("@/src/components/editor/ContractEditorClient").then((m) => m.ContractEditorClient),
  { ssr: false },
);

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
