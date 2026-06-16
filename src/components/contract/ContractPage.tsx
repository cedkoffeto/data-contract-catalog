import { ContractPageClient } from "@/src/components/contract/ContractPageClient";
import { PageShell } from "@/src/components/layout/PageShell";
import { getGitLabFileHistory } from "@/src/lib/gitlab";
import type { DataContract } from "@/src/lib/types";

export async function ContractPage({
  data,
  slug,
  yamlRaw,
  userId
}: {
  data: DataContract;
  slug: string;
  yamlRaw: string;
  userId?: string;
}) {
  const historyEntries = await getGitLabFileHistory(slug, 20).catch(() => []);

  return (
    <PageShell footerVersion="">
      <ContractPageClient data={data} historyEntries={historyEntries} slug={slug} yamlRaw={yamlRaw} userId={userId} />
    </PageShell>
  );
}
