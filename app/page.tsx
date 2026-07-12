import { prisma } from "@/src/lib/prisma";
import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards, hasGitLabTreeError, resetGitLabTreeError } from "@/src/lib/contracts";
import { getAccessibleSlugs, getEditableSlugs } from "@/src/lib/catalog-filter";
import { canWrite, type Permission } from "@/src/lib/rbac";
import type { CatalogCard } from "@/src/lib/types";
import { auth } from "@/src/auth";
import { getUserSubscriptions } from "@/src/lib/subscriptions";
import { getPinnedSlugs, getUserFavoriteSlugs } from "@/src/lib/preferences";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.name;

  resetGitLabTreeError();

  const extra = session?.user as Record<string, unknown> | undefined;
  const permissions = (extra?.permissions as Permission[] | undefined) ?? [];

  // Fetch cards and user-specific data in parallel
  const [cards] = await Promise.all([
    getCatalogCards().catch((err) => {
      console.error("[home] Failed to fetch catalog cards:", err);
      return [] as CatalogCard[];
    }),
  ]);

  const gitError = hasGitLabTreeError();

  if (!userId) {
    return <CatalogPage cards={[]} gitError={gitError} />;
  }

  const [accessible, editable, pendingRequests, subscriptions, pinnedSlugsArr, favoriteSlugsArr] = await Promise.all([
    getAccessibleSlugs(userId, permissions, cards),
    getEditableSlugs(userId, permissions, cards),
    prisma.accessRequest.findMany({
      where: { userId, status: "pending" },
      select: { dataContract: true },
      distinct: ["dataContract"],
    }),
    getUserSubscriptions(userId),
    getPinnedSlugs(userId),
    getUserFavoriteSlugs(userId),
  ]);

  const pinnedSlugs = new Set(pinnedSlugsArr);
  const favoriteSlugs = new Set(favoriteSlugsArr);

  const pendingSlugs = new Set(pendingRequests.map((r) => r.dataContract));
  const subscriptionSlugs = new Set(subscriptions.map((s) => s.contract_slug));

  const canRequestUpgrade = !canWrite(permissions);

  const annotated = cards.map((card) => ({
    ...card,
    accessible: accessible.has(card.slug),
    editable: editable.has(card.slug),
    accessRequestStatus: pendingSlugs.has(card.slug) ? "pending" as const : undefined,
    isFavorite: favoriteSlugs.has(card.slug),
    isPinned: pinnedSlugs.has(card.slug),
  }));
  return <CatalogPage cards={annotated} canRequestUpgrade={canRequestUpgrade} gitError={gitError} subscriptionSlugs={subscriptionSlugs} />;
}
