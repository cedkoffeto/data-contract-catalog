export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
 
import { listContractComments } from "@/src/lib/comments";
import { getContractBySlug } from "@/src/lib/contracts";
import { listContractIssues } from "@/src/lib/issues";
import { authorize } from "@/src/lib/access-control";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { listUserProfiles, upsertUserProfile } from "@/src/lib/users";
import { logger } from "@/src/lib/logger";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { slug } = await params;

    const contract = await getContractBySlug(slug);
    if (!contract) {
      return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
    }

    const permissions = await getGlobalPermissions(session);
    if (!permissions.includes("admin")) {
      const allowed = await authorize(
        userId,
        contract.data.asset?.domain ?? "",
        contract.data.asset?.context ?? "",
        "read",
        slug,
      );
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const extra = session.user as Record<string, unknown>;
    const firstName = typeof extra.givenName === "string" ? extra.givenName : "";
    const lastName = typeof extra.familyName === "string" ? extra.familyName : "";
    await upsertUserProfile({ userId, firstName, lastName });

    const [comments, issues, users] = await Promise.all([
      listContractComments(slug),
      listContractIssues(slug),
      listUserProfiles(""),
    ]);

    return NextResponse.json({ comments, issues, users });
  } catch (error) {
    logger.error("[discussion-data] Failed to load discussion:", error);
    return apiError(error);
  }
}
