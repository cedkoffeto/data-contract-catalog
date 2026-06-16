import type { Metadata } from "next";

import { ContractEditorPage } from "@/src/components/editor/ContractEditorPage";
import { getEditorRepositoryFiles } from "@/src/lib/contracts";
import { createNewContractDraft, getEditorSchema } from "@/src/lib/editor-schema";

export const metadata: Metadata = {
  title: "Contract workspace"
};

export default async function ContractEditorRoutePage({
  searchParams
}: {
  searchParams?: Promise<{ contract?: string | string[] }>;
}) {
  const schema = await getEditorSchema();
  const draft = createNewContractDraft();
  const repositoryFiles = await getEditorRepositoryFiles();
  const resolved = await searchParams;
  const contractParam = Array.isArray(resolved?.contract) ? resolved?.contract[0] : resolved?.contract;

  return (
    <ContractEditorPage
      data={draft}
      initialContractSlug={contractParam}
      repositoryFiles={repositoryFiles}
      schema={schema}
    />
  );
}
