import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContractPage } from "@/src/components/contract/ContractPage";
import { getContractPageData } from "@/src/lib/contracts";

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

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} />;
}
