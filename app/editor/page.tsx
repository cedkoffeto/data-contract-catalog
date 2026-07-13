import type { Metadata } from "next";

import { GoBackButton } from "@/src/components/ui/GoBackButton";
import { PageShell } from "@/src/components/layout/PageShell";
import { ContractEditorPage } from "@/src/components/editor/ContractEditorPage";
import { auth } from "@/src/auth";
import { canEditContract } from "@/src/lib/catalog-filter";
import { getContractPageData, getEditorRepositoryFiles } from "@/src/lib/contracts";
import { createNewContractDraft, getEditorSchema } from "@/src/lib/editor-schema";
import { getGlobalPermissions } from "@/src/lib/require-auth";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Contract workspace"
};

function UnauthorizedEditorPage() {
  return (
    <PageShell footerVersion="">
      <main className="pb-7">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 pb-8 pt-10 lg:px-8">
          <div className="w-full max-w-xl rounded-xl border bg-white shadow-lg">
            <div className="p-12 text-center">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                  <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900">Accès non autorisé</p>
                <h1 className="text-7xl font-bold text-orange-500">403</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">Vous devez avoir un droit editor ou admin pour utiliser cet espace.</p>
            </div>
            <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-20 pb-12 pt-4">
              <a
                href="/"
                className="catalog-primary-link"
              >
                Retour au catalogue
              </a>
              <GoBackButton />
            </div>
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

  const permissions = await getGlobalPermissions(session);
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
  } else if (!permissions.includes("write") && !permissions.includes("admin")) {
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
