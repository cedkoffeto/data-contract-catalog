export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createContractIssue, listContractIssues } from "@/src/lib/issues";
import { getContractBySlug } from "@/src/lib/contracts";
import { authorize } from "@/src/lib/access-control";
import type { Session } from "next-auth";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";

const IssueCreateSchema = z.object({
  body: z.string().min(1, "Issue body is required").max(4000),
});

async function ensureCanReadContract(slug: string, session: Session) {
  const contract = await getContractBySlug(slug);
  if (!contract) {
    return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
  }

  const userId = session?.user?.name ?? "";
  const permissions = await getGlobalPermissions(session);
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

async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, session);
  if (forbidden) return forbidden;

  const issues = await listContractIssues(slug);
  return NextResponse.json({ issues });
}

async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { slug } = await params;
  const forbidden = await ensureCanReadContract(slug, session);
  if (forbidden) return forbidden;

  const parsed = IssueCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const issue = await createContractIssue({
    contractSlug: slug,
    userId,
    body: parsed.data.body,
  });

  return NextResponse.json({ issue }, { status: 201 });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
