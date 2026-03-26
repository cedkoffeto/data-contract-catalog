import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContractPage } from "@/src/components/contract/ContractPage";
import { getContractPageData, getContracts } from "@/src/lib/contracts";

export async function generateStaticParams() {
  const contracts = await getContracts();
  return contracts.map((contract) => ({ slug: contract.slug }));
}

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
