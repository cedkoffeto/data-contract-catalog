import { CatalogPage } from "@/src/components/catalog/CatalogPage";
import { getCatalogCards } from "@/src/lib/contracts";

export default function HomePage() {
  const cards = getCatalogCards();
  return <CatalogPage cards={cards} />;
}
