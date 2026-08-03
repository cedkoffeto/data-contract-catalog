export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { getCatalogCards } from "@/src/lib/contracts";
import { filterCatalogCards } from "@/src/lib/catalog-filter";
import { withErrorHandling } from "@/src/lib/with-error-handling";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

async function GET(request: Request) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : DEFAULT_LIMIT;
  const cursor = searchParams.get("cursor") || undefined;

  const permissions = await getGlobalPermissions(session);
  const cards = await getCatalogCards();
  const filtered = await filterCatalogCards(userId, cards, permissions);

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = filtered.findIndex((card) => card.slug === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const page = filtered.slice(startIndex, startIndex + limit + 1);
  const hasMore = page.length > limit;
  const contracts = (hasMore ? page.slice(0, limit) : page).map((card) => ({
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

  const nextCursor = hasMore ? contracts[contracts.length - 1].slug : null;

  return NextResponse.json({ contracts, nextCursor });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
