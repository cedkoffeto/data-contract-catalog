import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/src/auth";
import { ContractPage } from "@/src/components/contract/ContractPage";
import { RequestAccessDialog } from "@/src/components/contract/RequestAccessDialog";
import { authorize } from "@/src/lib/access-control";
import { canEditContract } from "@/src/lib/catalog-filter";
import { getContractPageData } from "@/src/lib/contracts";
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
  const page = await getContractPageData(slug);
  if (!page) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.name;

  const domain = page.data.asset?.domain ?? "";
  const context = page.data.asset?.context ?? "";
  const globalPermissions = userId ? await getUserPermissions(userId) : [];
  const canEdit = await canEditContract(userId, globalPermissions, domain, context, slug);

  if (userId) {
    if (!globalPermissions.includes("admin")) {
      const allowed = await authorize(userId, domain, context, "read", slug);
      if (!allowed) {
        return <Forbidden slug={slug} domain={domain} context={context} />;
      }
    }
  } else {
    return <Forbidden message="Authentification requise" />;
  }

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} userId={userId} canEdit={canEdit} />;
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
