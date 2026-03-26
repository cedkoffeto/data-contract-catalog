import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards } from "@/src/lib/contracts";

export default async function HomePage() {
  const cards = await getCatalogCards();
  return <CatalogPage cards={cards} />;
}
