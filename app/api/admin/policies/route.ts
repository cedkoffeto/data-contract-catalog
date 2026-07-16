export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/src/lib/api-error";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import {
  checkPolicyConflicts,
  createAccessPolicy,
  findNarrowerPolicies,
  getAccessPolicy,
  listAccessPolicies,
  listPermissions,
} from "@/src/lib/access-control";
import { extractSessionId } from "@/src/lib/audit-session";
import { withErrorHandling } from "@/src/lib/with-error-handling";

const PolicyCreateSchema = z.object({
  userId: z.string().max(200).nullable().optional(),
  groupId: z.number().int().nullable().optional(),
  permissionId: z.number().int().positive(),
  domainScope: z.string().max(200).nullable().optional(),
  contextScope: z.string().max(200).nullable().optional(),
  dataContractScope: z.string().max(200).nullable().optional(),
  force: z.boolean().optional(),
});

async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const items = await listAccessPolicies();
  return NextResponse.json({ items });
}

async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  if (!session?.user?.email) {
    return apiError("Authentication required", 401);
  }
  const actorId = session.user.email;

  const sessionId = extractSessionId(request);

  const parsed = PolicyCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  const { userId, groupId, permissionId, domainScope, contextScope, dataContractScope, force } = parsed.data;

  if (!userId && !groupId) {
    return apiError("Either userId or groupId is required", 400);
  }
  if (userId && groupId) {
    return apiError("Provide either userId or groupId, not both", 400);
  }

  const conflict = await checkPolicyConflicts({
    userId: userId ?? null,
    groupId: groupId ?? null,
    permissionId,
    domainScope: domainScope ?? null,
    contextScope: contextScope ?? null,
    dataContractScope: dataContractScope ?? null,
  });

  if (conflict) {
    if (force && (conflict.type === "overlap" || conflict.type === "broader")) {
      const policy = await createAccessPolicy({
        userId: userId ?? null,
        groupId: groupId ?? null,
        permissionId,
        domainScope: domainScope ?? null,
        contextScope: contextScope ?? null,
        dataContractScope: dataContractScope ?? null,
        actorId,
        force: true,
        sessionId,
      });
      return NextResponse.json(policy, { status: 200 });
    }

    let affectedPolicies: Array<{ id: number; domain_scope: string | null; context_scope: string | null; data_contract_scope: string | null; permission_name: string }> = [];
    if (conflict.type === "broader") {
      const ids = await findNarrowerPolicies(
        userId ?? null, groupId ?? null,
        domainScope ?? null, contextScope ?? null, dataContractScope ?? null,
        conflict.existing.id,
      );
      for (const id of ids) {
        const p = await getAccessPolicy(id);
        if (p) affectedPolicies.push(p);
      }
      affectedPolicies.push(conflict.existing);
    }

    return NextResponse.json({
      conflict,
      affectedPolicies,
      newPolicy: {
        assignTo: userId ?? `group:${groupId}`,
        permissionId,
        permissionName: (await listPermissions()).find((p) => p.id === permissionId)?.name ?? "unknown",
        domainScope: domainScope ?? null,
        contextScope: contextScope ?? null,
        dataContractScope: dataContractScope ?? null,
      },
    }, { status: 409 });
  }

  const policy = await createAccessPolicy({
    userId: userId ?? null,
    groupId: groupId ?? null,
    permissionId,
    domainScope: domainScope ?? null,
    contextScope: contextScope ?? null,
    dataContractScope: dataContractScope ?? null,
    actorId,
    sessionId,
  });

  return NextResponse.json(policy, { status: 201 });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
export const POST_handler = withErrorHandling(POST);
export { POST_handler as POST };
