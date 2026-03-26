import { CatalogClient } from "@/src/components/catalog/CatalogClient";
import { PageShell } from "@/src/components/layout/PageShell";
import type { CatalogCard } from "@/src/lib/types";

export function CatalogPage({ cards }: { cards: CatalogCard[] }) {
  return (
    <PageShell footerVersion="V0">
      <main className="catalog-page">
        <CatalogClient cards={cards} />
      </main>
    </PageShell>
  );
}
