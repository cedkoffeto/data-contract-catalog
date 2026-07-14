export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { getContractBySlug } from "@/src/lib/contracts";
import { getGitLabFileContent, isGitLabConfigurationError } from "@/src/lib/gitlab";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { authorize } from "@/src/lib/access-control";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;

  const { slug } = await context.params;

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
      return NextResponse.json({ error: "Forbidden: insufficient permissions on this contract" }, { status: 403 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref") ?? undefined;
    const payload = await getGitLabFileContent(slug, ref);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.cause && typeof error.cause === "object") {
      const cause = error.cause as { response?: { status?: number } };
      if (cause.response?.status === 404) {
        return NextResponse.json({ content: null, notFoundAtRef: true });
      }
    }
    return apiError(error, isGitLabConfigurationError(error) ? 503 : 500);
  }
}
