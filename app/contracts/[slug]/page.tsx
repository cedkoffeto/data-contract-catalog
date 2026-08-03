import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/src/auth";
import { ContractPage } from "@/src/components/contract/ContractPage";
import { getEffectivePermissions } from "@/src/lib/access-control";
import { getContractPageData } from "@/src/lib/contracts";
import { getDiscussionSummary } from "@/src/lib/comments";
import { getGitLabFileHistory } from "@/src/lib/gitlab";
import { getSubscription } from "@/src/lib/subscriptions";
import { getUserContractPreferences } from "@/src/lib/preferences";
import type { ContractHistoryEntry } from "@/src/lib/types";
import type { Permission } from "@/src/lib/rbac";

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

  // Fetch contract and auth in parallel; history uses the resolved path to avoid a duplicate GitLab call
  const [page, session] = await Promise.all([
    getContractPageData(slug),
    auth(),
  ]);
  const historyEntries = page
    ? await getGitLabFileHistory(slug, 20, page.fullPath).catch(() => [] as ContractHistoryEntry[])
    : [];
  if (!page) {
    notFound();
  }

  const userId = session?.user?.name;

  if (!userId) {
    notFound();
  }

  const extra = session.user as Record<string, unknown>;
  const globalPermissions = (extra.permissions as Permission[]) ?? [];
  const domain = page.data.asset?.domain ?? "";
  const context = page.data.asset?.context ?? "";

  // Single effective permissions call instead of three separate authorize calls
  const effectivePerms = globalPermissions.includes("admin") || globalPermissions.includes("write")
    ? ([] as const)
    : await getEffectivePermissions(userId, domain, context, slug);
  const allPerms = [...new Set([...globalPermissions, ...effectivePerms])];
  const canRead = allPerms.some((p) => p === "admin" || p === "write" || p === "read" || p === "editor" || p === "reader");
  const canEdit = allPerms.some((p) => p === "admin" || p === "write" || p === "editor");
  const canAdmin = allPerms.includes("admin");

  if (!canRead) {
    notFound();
  }

  const [discussion, subscription, prefs] = await Promise.all([
    getDiscussionSummary(slug),
    getSubscription(userId, slug),
    getUserContractPreferences(userId, slug),
  ]);

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} historyEntries={historyEntries} userId={userId} canRead={canRead} canEdit={canEdit} canAdmin={canAdmin} initialCommentCount={discussion.commentCount} initialIssueCount={discussion.issueCount} initialSubscribed={subscription !== null} initialIsFavorite={prefs.isFavorite} incomingRelations={page.incomingRelations} />;
}
