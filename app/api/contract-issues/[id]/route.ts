export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { updateContractIssueStatus, type IssueStatus } from "@/src/lib/issues";
import { getContractIssue } from "@/src/lib/issues";
import { getContractBySlug } from "@/src/lib/contracts";
import { authorize } from "@/src/lib/access-control";
import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return apiError("Invalid issue id", 400);
  }

  const issue = await getContractIssue(id);
  if (!issue) {
    return apiError("Issue not found", 404);
  }

  const contract = await getContractBySlug(issue.contractSlug);
  if (!contract) {
    return apiError(`Contract "${issue.contractSlug}" not found`, 404);
  }

  const permissions = await getGlobalPermissions(session);
  if (!permissions.includes("admin")) {
    const allowed = await authorize(
      userId,
      contract.data.asset?.domain ?? "",
      contract.data.asset?.context ?? "",
      "admin",
      issue.contractSlug,
    );

    if (!allowed) {
      return apiError("Forbidden", 403);
    }
  }

  const body = (await request.json()) as { status?: string };
  const status = body.status;
  if (status !== "open" && status !== "fixed" && status !== "false_alert") {
    return apiError("Invalid status", 400);
  }

  const updated = await updateContractIssueStatus(id, status as IssueStatus);
  return NextResponse.json({ issue: updated });
}

export const PATCH_handler = withErrorHandling(PATCH);
export { PATCH_handler as PATCH };
