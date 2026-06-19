import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/src/auth";
import { ContractPage } from "@/src/components/contract/ContractPage";
import { RequestAccessDialog } from "@/src/components/contract/RequestAccessDialog";
import { authorize } from "@/src/lib/access-control";
import { canEditContract } from "@/src/lib/catalog-filter";
import { getContractPageData } from "@/src/lib/contracts";
import { getGitLabFileHistory } from "@/src/lib/gitlab";
import type { ContractHistoryEntry } from "@/src/lib/types";
import { getUserPermissions } from "@/src/lib/rbac";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getContractPageData(slug);
  if (!page) {
    return { title: "Contrat introuvable" };
  }

  return {
    title: `Contrat de données ${page.data.asset?.name ?? slug}`
  };
}

export default async function ContractRoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Parallelize contract fetch, history fetch, and auth (all independent)
  const [page, historyEntries, session] = await Promise.all([
    getContractPageData(slug),
    getGitLabFileHistory(slug, 20).catch(() => [] as ContractHistoryEntry[]),
    auth(),
  ]);
  if (!page) {
    notFound();
  }

  const userId = session?.user?.name;

  const domain = page.data.asset?.domain ?? "";
  const context = page.data.asset?.context ?? "";
  const globalPermissions = userId ? await getUserPermissions(userId) : [];

  if (!userId) {
    return <Forbidden message="Authentification requise" />;
  }

  // Parallelize permission checks
  const [canEdit, canRead] = await Promise.all([
    canEditContract(userId, globalPermissions, domain, context, slug),
    globalPermissions.includes("admin")
      ? Promise.resolve(true)
      : authorize(userId, domain, context, "read", slug),
  ]);

  if (!canRead) {
    return <Forbidden slug={slug} domain={domain} context={context} />;
  }

  const canAdmin = globalPermissions.includes("admin") || await authorize(userId, domain, context, "admin", slug);

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} historyEntries={historyEntries} userId={userId} canEdit={canEdit} canAdmin={canAdmin} />;
}

function Forbidden({ message, slug, domain, context }: { message?: string; slug?: string; domain?: string; context?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300">403</h1>
        <p className="mt-2 text-lg text-gray-500">
          {message ?? "Vous n'êtes pas autorisé à consulter ce contrat de données."}
        </p>
        {slug && <RequestAccessDialog slug={slug} domain={domain} context={context} />}
      </div>
    </div>
  );
}
