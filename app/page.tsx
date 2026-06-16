import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards } from "@/src/lib/contracts";
import { filterCatalogCards } from "@/src/lib/catalog-filter";
import { getUserPermissions } from "@/src/lib/rbac";
import { auth } from "@/src/auth";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.name;
  const permissions = userId ? await getUserPermissions(userId) : [];

  const cards = await getCatalogCards();
  const filtered = userId ? await filterCatalogCards(userId, cards, permissions) : [];
  return <CatalogPage cards={filtered} />;
}
