import { CatalogClient } from "@/src/components/catalog/CatalogClient";
import { PageShell } from "@/src/components/layout/PageShell";
import type { CatalogCard } from "@/src/lib/types";

export function CatalogPage({ cards, canRequestUpgrade, gitError, subscriptionSlugs: initialSubscriptionSlugs }: { cards: CatalogCard[]; canRequestUpgrade?: boolean; gitError?: boolean; subscriptionSlugs?: Set<string> }) {
  return (
    <PageShell footerVersion="V0">
      <main className="catalog-page">
        <CatalogClient cards={cards} canRequestUpgrade={canRequestUpgrade} gitError={gitError} initialSubscriptionSlugs={initialSubscriptionSlugs} />
      </main>
    </PageShell>
  );
}
