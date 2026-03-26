import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContractPage } from "@/src/components/contract/ContractPage";
import { getContractPageData, getContracts } from "@/src/lib/contracts";

export function generateStaticParams() {
  return getContracts().map((contract) => ({ slug: contract.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = getContractPageData(params.slug);
  if (!page) {
    return { title: "Contrat introuvable" };
  }

  return {
    title: `Contrat de données ${page.data.asset?.name ?? params.slug}`
  };
}

export default function ContractRoutePage({ params }: { params: { slug: string } }) {
  const page = getContractPageData(params.slug);
  if (!page) {
    notFound();
  }

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} />;
}
