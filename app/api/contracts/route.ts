import { NextResponse } from "next/server";

import { requireApiAuth } from "@/src/lib/require-auth";
import { getCatalogCards } from "@/src/lib/contracts";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const cards = await getCatalogCards();
  const items = cards.map((card) => ({
    slug: card.slug,
    title: card.title,
    version: card.version,
    owner: card.owner,
    description: card.description,
    maturity: card.maturity,
    domain: card.domain,
    url: card.href
  }));

  return NextResponse.json({ items });
}
