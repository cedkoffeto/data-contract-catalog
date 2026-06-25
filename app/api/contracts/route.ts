export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { getCatalogCards } from "@/src/lib/contracts";
import { filterCatalogCards } from "@/src/lib/catalog-filter";

export async function GET() {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const permissions = await getGlobalPermissions(session);
  const cards = await getCatalogCards();
  const filtered = await filterCatalogCards(userId, cards, permissions);
  const items = filtered.map((card) => ({
    slug: card.slug,
    title: card.title,
    version: card.version,
    owner: card.owner,
    description: card.description,
    maturity: card.maturity,
    domain: card.domain,
    context: card.context,
    url: card.href
  }));

  return NextResponse.json({ items });
}
