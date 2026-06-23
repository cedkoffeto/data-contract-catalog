import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/src/auth";
import { ContractPage } from "@/src/components/contract/ContractPage";
import { RequestAccessDialog } from "@/src/components/contract/RequestAccessDialog";
import { getEffectivePermissions } from "@/src/lib/access-control";
import { getContractPageData } from "@/src/lib/contracts";
import { getDiscussionSummary } from "@/src/lib/comments";
import { getGitLabFileHistory } from "@/src/lib/gitlab";
import type { ContractHistoryEntry } from "@/src/lib/types";
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

  const domain = page.data.asset?.domain ?? "";
  const context = page.data.asset?.context ?? "";
  const globalPermissions = userId ? await getUserPermissions(userId) : [];

  if (!userId) {
    return <Forbidden message="Authentification requise" />;
  }

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

  const { commentCount: initialCommentCount, issueCount: initialIssueCount } = await getDiscussionSummary(slug);

  return <ContractPage data={page.data} slug={page.slug} yamlRaw={page.yamlRaw} historyEntries={historyEntries} userId={userId} canRead={canRead} canEdit={canEdit} canAdmin={canAdmin} initialCommentCount={initialCommentCount} initialIssueCount={initialIssueCount} />;
}

function Forbidden({ message, slug, domain, context }: { message?: string; slug?: string; domain?: string; context?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-300">403</h1>
        <p className="mt-2 text-lg text-gray-500">
          {message ?? "Vous n'êtes pas autorisé à consulter ce contrat de données."}
        </p>
        {slug && <RequestAccessDialog slug={slug} domain={domain} context={context} />}
      </div>
    </div>
  );
}
