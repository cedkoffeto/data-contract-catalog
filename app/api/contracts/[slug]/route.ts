export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { getContractBySlug } from "@/src/lib/contracts";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { authorize } from "@/src/lib/access-control";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;

  const { slug } = await params;
  const contract = await getContractBySlug(slug);

  if (!contract) {
    return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
  }
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contractDomain = contract.data.asset?.domain ?? "";
  const contractCtx = contract.data.asset?.context ?? "";

  const permissions = await getGlobalPermissions(session);
  if (!permissions.includes("admin")) {
    const allowed = await authorize(userId, contractDomain, contractCtx, "read", slug);
    if (!allowed) {
      return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
    }
  }

  return NextResponse.json({
    slug: contract.slug,
    stem: contract.stem,
    maturity: contract.maturity,
    fullPath: contract.fullPath,
    yamlRaw: contract.yamlRaw,
    data: contract.data
  });
}
