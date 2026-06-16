import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards } from "@/src/lib/contracts";
import { getAccessibleSlugs } from "@/src/lib/catalog-filter";
import { getUserPermissions } from "@/src/lib/rbac";
import { auth } from "@/src/auth";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.name;
  const permissions = userId ? await getUserPermissions(userId) : [];

  const cards = await getCatalogCards();
  if (!userId) {
    return <CatalogPage cards={[]} />;
  }

  const accessible = await getAccessibleSlugs(userId, permissions, cards);
  const annotated = cards.map((card) => ({
    ...card,
    accessible: accessible.has(card.slug),
  }));
  return <CatalogPage cards={annotated} />;
}
