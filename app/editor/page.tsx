import type { Metadata } from "next";

import { PageShell } from "@/src/components/layout/PageShell";
import { ContractEditorPage } from "@/src/components/editor/ContractEditorPage";
import { auth } from "@/src/auth";
import { canEditContract } from "@/src/lib/catalog-filter";
import { getContractPageData, getEditorRepositoryFiles } from "@/src/lib/contracts";
import { createNewContractDraft, getEditorSchema } from "@/src/lib/editor-schema";
import { getUserPermissions } from "@/src/lib/rbac";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Contract workspace"
};

function UnauthorizedEditorPage() {
  return (
    <PageShell footerVersion="">
      <main className="pb-7">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 pb-8 pt-10 lg:px-8">
          <div className="w-full max-w-sm rounded-xl border bg-white p-8 text-center shadow-lg">
            <h1 className="text-5xl font-bold text-gray-200">403</h1>
            <p className="mt-3 text-base font-semibold text-gray-900">Accès non autorisé</p>
            <p className="mt-1 text-sm text-gray-500">Vous devez avoir un droit editor ou admin pour utiliser cet espace.</p>
            <a
              href="/"
              className="mt-6 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
            >
              Retour au catalogue
            </a>
          </div>
        </div>
      </main>
    </PageShell>
  );
}

export default async function ContractEditorRoutePage({
  searchParams
}: {
  searchParams?: Promise<{ contract?: string | string[] }>;
}) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return <UnauthorizedEditorPage />;
  }

  const permissions = await getUserPermissions(userId);
  const hasGlobalEditorAccess = permissions.includes("write") || permissions.includes("admin");
  const resolved = await searchParams;
  const contractParam = Array.isArray(resolved?.contract) ? resolved?.contract[0] : resolved?.contract;

  if (contractParam) {
    const contract = await getContractPageData(contractParam);
    if (!contract) {
      notFound();
    }

    const domain = contract.data.asset?.domain ?? "";
    const context = contract.data.asset?.context ?? "";
    const canEdit = await canEditContract(userId, permissions, domain, context, contractParam);
    if (!canEdit) {
      return <UnauthorizedEditorPage />;
    }
  } else if (!hasGlobalEditorAccess) {
    return <UnauthorizedEditorPage />;
  }

  const schema = await getEditorSchema();
  const draft = createNewContractDraft();
  const repositoryFiles = await getEditorRepositoryFiles();

  return (
    <ContractEditorPage
      userId={userId}
      data={draft}
      initialContractSlug={contractParam}
      repositoryFiles={repositoryFiles}
      schema={schema}
    />
  );
}
