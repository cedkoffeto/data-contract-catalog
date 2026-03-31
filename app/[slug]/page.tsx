import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContractPage } from "@/src/components/contract/ContractPage";
import { getContractPageData } from "@/src/lib/contracts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getContractPageData(params.slug);
  if (!page) {
    return { title: "Contrat introuvable" };
  }

  return {
    title: `Contrat de données ${page.data.asset?.name ?? params.slug}`
  };
}

export default async function ContractRoutePage({ params }: { params: { slug: string } }) {
  const page = await getContractPageData(params.slug);
  if (!page) {
    notFound();
  }

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} />;
}
