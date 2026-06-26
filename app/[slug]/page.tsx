import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/src/auth";
import { ContractPage } from "@/src/components/contract/ContractPage";
import { GoBackButton } from "@/src/components/ui/GoBackButton";
import { RequestAccessDialog } from "@/src/components/contract/RequestAccessDialog";
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
    return <Forbidden message="Authentification requise" />;
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
    return <Forbidden slug={slug} domain={domain} context={context} />;
  }

  const [discussion, subscription, prefs] = await Promise.all([
    getDiscussionSummary(slug),
    getSubscription(userId, slug),
    getUserContractPreferences(userId, slug),
  ]);

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} historyEntries={historyEntries} userId={userId} canRead={canRead} canEdit={canEdit} canAdmin={canAdmin} initialCommentCount={discussion.commentCount} initialIssueCount={discussion.issueCount} initialSubscribed={subscription !== null} initialIsFavorite={prefs.isFavorite} />;
}

function Forbidden({ message, slug, domain, context }: { message?: string; slug?: string; domain?: string; context?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border bg-white shadow-lg">
        <div className="p-12 text-center">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
              <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">Accès refusé</p>
            <h1 className="text-7xl font-bold text-gray-400">403</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {message ?? "Vous n'êtes pas autorisé à consulter ce contrat de données."}
          </p>
          {slug && (
            <div className="mt-4 flex justify-center">
              <RequestAccessDialog slug={slug} domain={domain} context={context} />
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-20 pb-12 pt-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            Retour au catalogue
          </Link>
          <GoBackButton />
        </div>
      </div>
    </div>
  );
}
