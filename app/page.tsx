import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards } from "@/src/lib/contracts";
import { getAccessibleSlugs } from "@/src/lib/catalog-filter";
import { getUserPermissions } from "@/src/lib/rbac";
import { auth } from "@/src/auth";
import { query } from "@/src/lib/db";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.name;
  const permissions = userId ? await getUserPermissions(userId) : [];

  const cards = await getCatalogCards();
  if (!userId) {
    return <CatalogPage cards={[]} />;
  }

  const accessible = await getAccessibleSlugs(userId, permissions, cards);

  const pendingRows = await query<{ data_contract: string }>(
    "SELECT DISTINCT data_contract FROM access_requests WHERE user_id = ? AND status = 'pending'",
    [userId],
  );
  const pendingSlugs = new Set(pendingRows.map((r) => r.data_contract));
  const favoriteSlugs = userId ? await getFavoriteSlugs(userId) : [];

  const annotated = cards.map((card) => {
    const rows = userId ? favoriteSlugs.filter((s) => s === card.slug) : [];
    return {
      ...card,
      accessible: accessible.has(card.slug),
      accessRequestStatus: pendingSlugs.has(card.slug) ? "pending" as const : undefined,
      isFavorite: rows.length > 0,
    };
  });
  return <CatalogPage cards={annotated} />;
}

async function getFavoriteSlugs(userId: string): Promise<string[]> {
  const rows = await query<{ contract_slug: string }>(
    "SELECT contract_slug FROM user_contract_preferences WHERE user_id = ? AND is_favorite = 1",
    [userId],
  );
  return rows.map((r) => r.contract_slug);
}
