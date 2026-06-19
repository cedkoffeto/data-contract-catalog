import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards } from "@/src/lib/contracts";
import { getAccessibleSlugs } from "@/src/lib/catalog-filter";
import { getUserPermissions, type Permission } from "@/src/lib/rbac";
import type { CatalogCard } from "@/src/lib/types";
import { auth } from "@/src/auth";
import { query } from "@/src/lib/db";
import { getPinnedSlugs } from "@/src/lib/preferences";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.name;

  // Fetch cards and user-specific data in parallel
  const [cards, permissions] = await Promise.all([
    getCatalogCards().catch(() => [] as CatalogCard[]),
    userId ? getUserPermissions(userId) : Promise.resolve([] as Permission[]),
  ]);

  if (!userId) {
    return <CatalogPage cards={[]} />;
  }

  const [accessible, pendingRows, favoriteSlugs, pinnedSlugs] = await Promise.all([
    getAccessibleSlugs(userId, permissions, cards),
    query<{ data_contract: string }>(
      "SELECT DISTINCT data_contract FROM access_requests WHERE user_id = ? AND status = 'pending'",
      [userId],
    ),
    getPreferenceSlugs(userId, "is_favorite"),
    getPinnedSlugs(userId),
  ]);

  const pendingSlugs = new Set(pendingRows.map((r) => r.data_contract));
  const pinnedSet = new Set(pinnedSlugs);

  const annotated = cards.map((card) => ({
    ...card,
    accessible: accessible.has(card.slug),
    accessRequestStatus: pendingSlugs.has(card.slug) ? "pending" as const : undefined,
    isFavorite: favoriteSlugs.has(card.slug),
    isPinned: pinnedSet.has(card.slug),
  }));
  return <CatalogPage cards={annotated} />;
}

async function getPreferenceSlugs(userId: string, column: string): Promise<Set<string>> {
  const rows = await query<{ contract_slug: string }>(
    `SELECT contract_slug FROM user_contract_preferences WHERE user_id = ? AND ${column} = 1`,
    [userId],
  );
  return new Set(rows.map((r) => r.contract_slug));
}
