import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { updateContractIssueStatus, type IssueStatus } from "@/src/lib/issues";
import { getContractIssue } from "@/src/lib/issues";
import { getContractBySlug } from "@/src/lib/contracts";
import { authorize } from "@/src/lib/access-control";
import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPermissions } from "@/src/lib/rbac";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid issue id" }, { status: 400 });
  }

  const issue = await getContractIssue(id);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const contract = await getContractBySlug(issue.contractSlug);
  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const permissions = await getUserPermissions(userId);
  if (!permissions.includes("admin")) {
    const allowed = await authorize(
      userId,
      contract.data.asset?.domain ?? "",
      contract.data.asset?.context ?? "",
      "admin",
      issue.contractSlug,
    );

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = (await request.json()) as { status?: string };
  const status = body.status;
  if (status !== "open" && status !== "fixed" && status !== "false_alert") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateContractIssueStatus(id, status as IssueStatus);
  return NextResponse.json({ issue: updated });
}
