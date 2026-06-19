import { ContractPageClient } from "@/src/components/contract/ContractPageClient";
import { PageShell } from "@/src/components/layout/PageShell";
import type { ContractHistoryEntry, DataContract } from "@/src/lib/types";

export async function ContractPage({
  data,
  slug,
  yamlRaw,
  historyEntries,
  userId,
  canEdit,
  canAdmin
}: {
  data: DataContract;
  slug: string;
  yamlRaw: string;
  historyEntries: ContractHistoryEntry[];
  userId?: string;
  canEdit: boolean;
  canAdmin: boolean;
}) {
  return (
    <PageShell footerVersion="">
      <ContractPageClient data={data} historyEntries={historyEntries} slug={slug} yamlRaw={yamlRaw} userId={userId} canEdit={canEdit} canAdmin={canAdmin} />
    </PageShell>
  );
}
