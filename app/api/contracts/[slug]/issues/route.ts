import { NextResponse } from "next/server";

import { auth } from "@/src/auth";
import { createContractIssue, listContractIssues } from "@/src/lib/issues";
import { getContractBySlug } from "@/src/lib/contracts";
import { authorize } from "@/src/lib/access-control";
import { requireApiAuth } from "@/src/lib/require-auth";
import { getUserPermissions } from "@/src/lib/rbac";

async function ensureCanReadContract(slug: string, userId: string) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const permissions = await getUserPermissions(userId);
  if (permissions.includes("admin")) {
    return null;
  }

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

  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, userId);
  if (forbidden) return forbidden;

  const issues = await listContractIssues(slug);
  return NextResponse.json({ issues });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, userId);
  if (forbidden) return forbidden;

  const body = (await request.json()) as { body?: string };
  const issueBody = body.body?.trim();

  if (!issueBody) {
    return NextResponse.json({ error: "Issue body is required" }, { status: 400 });
  }

  if (issueBody.length > 4000) {
    return NextResponse.json({ error: "Issue body is too long" }, { status: 400 });
  }

  const issue = await createContractIssue({
    contractSlug: slug,
    userId,
    body: issueBody,
  });

  return NextResponse.json({ issue }, { status: 201 });
}
