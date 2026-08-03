export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { searchCatalogCards } from "@/src/lib/contracts";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { filterCatalogCards } from "@/src/lib/catalog-filter";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(request: Request) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const permissions = await getGlobalPermissions(session);

  const { searchParams } = new URL(request.url);

  const cards = await searchCatalogCards({
    q: searchParams.get("q") ?? "",
    domain: searchParams.get("domain") ?? "",
    maturity: searchParams.get("maturity") ?? "",
    title: searchParams.get("title") ?? "",
    owner: searchParams.get("owner") ?? "",
    context: searchParams.get("context") ?? "",
    slug: searchParams.get("slug") ?? ""
  });

  const filtered = await filterCatalogCards(userId, cards, permissions);
  const contracts = filtered.map((card) => ({
    slug: card.slug,
    title: card.title,
    version: card.version,
    owner: card.owner,
    description: card.description,
    maturity: card.maturity,
    domain: card.domain,
    url: card.href
  }));

  return NextResponse.json({ contracts, nextCursor: null });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
