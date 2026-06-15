import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards } from "@/src/lib/contracts";
import { filterCatalogCards, getSessionPermissions } from "@/src/lib/catalog-filter";

export default async function HomePage() {
  const { permissions, canEdit } = await getSessionPermissions();
  const cards = await getCatalogCards();
  const filtered = filterCatalogCards(cards, permissions);
  return <CatalogPage cards={filtered} />;
}
