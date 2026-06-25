import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards, hasGitLabTreeError, resetGitLabTreeError } from "@/src/lib/contracts";
import { getAccessibleSlugs, getEditableSlugs } from "@/src/lib/catalog-filter";
import { canWrite, type Permission } from "@/src/lib/rbac";
import type { CatalogCard } from "@/src/lib/types";
import { auth } from "@/src/auth";
import { query } from "@/src/lib/db";

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

  const pinnedSlugs = new Set((extra?.pinnedSlugs as string[] | undefined) ?? []);
  const favoriteSlugs = new Set((extra?.favoriteSlugs as string[] | undefined) ?? []);
  const subscriptionSlugs = new Set((extra?.subscriptionSlugs as string[] | undefined) ?? []);

  const [accessible, editable, pendingRows] = await Promise.all([
    getAccessibleSlugs(userId, permissions, cards),
    getEditableSlugs(userId, permissions, cards),
    query<{ data_contract: string }>(
      "SELECT DISTINCT data_contract FROM access_requests WHERE user_id = ? AND status = 'pending'",
      [userId],
    ),
  ]);

  const pendingSlugs = new Set(pendingRows.map((r) => r.data_contract));

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
