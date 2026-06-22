import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards, hasGitLabTreeError, resetGitLabTreeError } from "@/src/lib/contracts";
import { getAccessibleSlugs } from "@/src/lib/catalog-filter";
import { canWrite, getUserPermissions, type Permission } from "@/src/lib/rbac";
import type { CatalogCard } from "@/src/lib/types";
import { auth } from "@/src/auth";
import { query } from "@/src/lib/db";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.name;

  resetGitLabTreeError();

  // Fetch cards and user-specific data in parallel
  const [cards, permissions] = await Promise.all([
    getCatalogCards().catch(() => [] as CatalogCard[]),
    userId ? getUserPermissions(userId) : Promise.resolve([] as Permission[]),
  ]);

  const gitError = hasGitLabTreeError();

  if (!userId) {
    return <CatalogPage cards={[]} gitError={gitError} />;
  }

  const [accessible, pendingRows, { favoriteSlugs, pinnedSlugs }] = await Promise.all([
    getAccessibleSlugs(userId, permissions, cards),
    query<{ data_contract: string }>(
      "SELECT DISTINCT data_contract FROM access_requests WHERE user_id = ? AND status = 'pending'",
      [userId],
    ),
    getPreferredSlugs(userId),
  ]);

  const pendingSlugs = new Set(pendingRows.map((r) => r.data_contract));

  const canRequestUpgrade = !canWrite(permissions);

  const annotated = cards.map((card) => ({
    ...card,
    accessible: accessible.has(card.slug),
    accessRequestStatus: pendingSlugs.has(card.slug) ? "pending" as const : undefined,
    isFavorite: favoriteSlugs.has(card.slug),
    isPinned: pinnedSlugs.has(card.slug),
  }));
  return <CatalogPage cards={annotated} canRequestUpgrade={canRequestUpgrade} gitError={gitError} />;
}

async function getPreferredSlugs(userId: string): Promise<{ favoriteSlugs: Set<string>; pinnedSlugs: Set<string> }> {
  const rows = await query<{ contract_slug: string; is_favorite: number; is_pinned: number }>(
    `SELECT contract_slug, is_favorite, is_pinned FROM user_contract_preferences WHERE user_id = ? AND (is_favorite = 1 OR is_pinned = 1)`,
    [userId],
  );
  const favoriteSlugs = new Set<string>();
  const pinnedSlugs = new Set<string>();
  for (const { contract_slug, is_favorite, is_pinned } of rows) {
    if (is_favorite) favoriteSlugs.add(contract_slug);
    if (is_pinned) pinnedSlugs.add(contract_slug);
  }
  return { favoriteSlugs, pinnedSlugs };
}
