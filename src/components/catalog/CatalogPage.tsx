import { CatalogClient } from "@/src/components/catalog/CatalogClient";
import { PageShell } from "@/src/components/layout/PageShell";
import type { CatalogCard } from "@/src/lib/types";

export function CatalogPage({ cards }: { cards: CatalogCard[] }) {
  return (
    <PageShell footerVersion="V0">
      <main className="pb-7">
        <div className="mx-auto max-w-7xl px-6 pb-2 pt-5 lg:px-8">
          <div>
            <div className="px-0 lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:tracking-tight">
                  Catalogue des Data Contrats
                </h2>
              </div>
            </div>
          </div>

          <div>
            <div className="mt-6 space-y-6">
              <CatalogClient cards={cards} />
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
