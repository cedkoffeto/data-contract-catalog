import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { getContractBySlug } from "@/src/lib/contracts";
import { requireApiAuth } from "@/src/lib/require-auth";
import { authorize } from "@/src/lib/access-control";
import { getUserPermissions } from "@/src/lib/rbac";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) {
    return unauthorized;
  }

  const { slug } = await params;
  const contract = await getContractBySlug(slug);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contractDomain = contract.data.asset?.domain ?? "";
  const contractCtx = contract.data.asset?.context ?? "";

  const globalPermissions = await getUserPermissions(userId);
  if (!globalPermissions.includes("admin")) {
    const allowed = await authorize(userId, contractDomain, contractCtx, "read");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions on this contract" }, { status: 403 });
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
