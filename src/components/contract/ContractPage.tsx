import { ContractPageClient } from "@/src/components/contract/ContractPageClient";
import { PageShell } from "@/src/components/layout/PageShell";
import type { ContractHistoryEntry, DataContract } from "@/src/lib/types";

export async function ContractPage({
  data,
  slug,
  yamlRaw,
  historyEntries,
  userId,
  canRead,
  canEdit,
  canAdmin,
  initialCommentCount,
  initialIssueCount,
  initialSubscribed,
  initialIsFavorite,
}: {
  data: DataContract;
  slug: string;
  yamlRaw: string;
  historyEntries: ContractHistoryEntry[];
  userId?: string;
  canRead: boolean;
  canEdit: boolean;
  canAdmin: boolean;
  initialCommentCount: number;
  initialIssueCount: number;
  initialSubscribed?: boolean;
  initialIsFavorite?: boolean;
}) {
  return (
    <PageShell footerVersion="">
      <ContractPageClient data={data} historyEntries={historyEntries} slug={slug} yamlRaw={yamlRaw} userId={userId} canRead={canRead} canEdit={canEdit} canAdmin={canAdmin} initialCommentCount={initialCommentCount} initialIssueCount={initialIssueCount} initialSubscribed={initialSubscribed} initialIsFavorite={initialIsFavorite} />
    </PageShell>
  );
}
