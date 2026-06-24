import dynamic from "next/dynamic";
import { PageShell } from "@/src/components/layout/PageShell";
import type { DataContract, EditorRepositoryFile } from "@/src/lib/types";
import type { RJSFSchema } from "@rjsf/utils";

const ContractEditorClient = dynamic(
  () => import("@/src/components/editor/ContractEditorClient").then((m) => m.ContractEditorClient),
);

export function ContractEditorPage({
  userId,
  data,
  initialContractSlug,
  repositoryFiles,
  schema
}: {
  userId: string;
  data: DataContract;
  initialContractSlug?: string;
  repositoryFiles: EditorRepositoryFile[];
  schema: RJSFSchema;
}) {
  return (
    <PageShell footerVersion="V0" showFooter={false}>
      <main className="editor-page-shell">
        <ContractEditorClient
          userId={userId}
          initialContractSlug={initialContractSlug}
          initialData={data}
          repositoryFiles={repositoryFiles}
          schema={schema}
        />
      </main>
    </PageShell>
  );
}
