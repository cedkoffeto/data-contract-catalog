import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { getContracts } from "@/src/lib/contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const context = searchParams.get("context");

  const contracts = await getContracts();

  let items = contracts.map((c) => ({
    slug: c.slug,
    title: (c.data.asset?.name ?? c.slug).toString().trim(),
    domain: (c.data.asset?.domain ?? "").toString().trim(),
    context: (c.data.asset?.context ?? "").toString().trim(),
  }));

  if (domain) {
    items = items.filter((s) => s.domain === domain);
  }
  if (context) {
    items = items.filter((s) => s.context === context);
  }

  return NextResponse.json({ items });
}
