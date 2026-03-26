import type { Metadata } from "next";

import { ContractEditorPage } from "@/src/components/editor/ContractEditorPage";
import { getEditorRepositoryFiles } from "@/src/lib/contracts";
import { createNewContractDraft, getEditorSchema } from "@/src/lib/editor-schema";

export const metadata: Metadata = {
  title: "Contract workspace"
};

export default function ContractEditorRoutePage({
  searchParams
}: {
  searchParams?: { contract?: string | string[] };
}) {
  const schema = getEditorSchema();
  const draft = createNewContractDraft();
  const repositoryFiles = getEditorRepositoryFiles();
  const contractParam = Array.isArray(searchParams?.contract) ? searchParams?.contract[0] : searchParams?.contract;

  return (
    <ContractEditorPage
      data={draft}
      initialContractSlug={contractParam}
      repositoryFiles={repositoryFiles}
      schema={schema}
    />
  );
}
