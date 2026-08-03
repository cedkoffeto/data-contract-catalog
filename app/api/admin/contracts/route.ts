import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { getContracts } from "@/src/lib/contracts";
import { withErrorHandling } from "@/src/lib/with-error-handling";

export const dynamic = "force-dynamic";

async function GET(request: Request) {
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

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
