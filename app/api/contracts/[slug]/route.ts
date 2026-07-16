export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { getContractBySlug } from "@/src/lib/contracts";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { authorize } from "@/src/lib/access-control";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;

  const { slug } = await params;
  const contract = await getContractBySlug(slug);

  if (!contract) {
      return apiError(`Contract "${slug}" not found`, 404);
  }
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const contractDomain = contract.data.asset?.domain ?? "";
  const contractCtx = contract.data.asset?.context ?? "";

  const permissions = await getGlobalPermissions(session);
  if (!permissions.includes("admin")) {
    const allowed = await authorize(userId, contractDomain, contractCtx, "read", slug);
    if (!allowed) {
    return apiError(`Contract "${slug}" not found`, 404);
    }
  }

  return NextResponse.json({
    slug: contract.slug,
    stem: contract.stem,
    maturity: contract.maturity,
    yamlRaw: contract.yamlRaw,
    data: contract.data
  });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
