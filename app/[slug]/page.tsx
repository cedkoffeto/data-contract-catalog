import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/src/auth";
import { ContractPage } from "@/src/components/contract/ContractPage";
import { authorize } from "@/src/lib/access-control";
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

  if (userId) {
    const globalPermissions = await getUserPermissions(userId);
    if (!globalPermissions.includes("admin")) {
      const domain = page.data.asset?.domain ?? "";
      const context = page.data.asset?.context ?? "";
      const allowed = await authorize(userId, domain, context, "read");
      if (!allowed) {
        return <Forbidden />;
      }
    }
  } else {
    return <Forbidden message="Authentification requise" />;
  }

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} userId={userId} />;
}

function Forbidden({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300">403</h1>
        <p className="mt-2 text-lg text-gray-500">
          {message ?? "Vous n'êtes pas autorisé à consulter ce contrat de données."}
        </p>
      </div>
    </div>
  );
}
