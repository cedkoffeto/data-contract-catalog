export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
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

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const items = await listAccessPolicies();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const sessionId = extractSessionId(request);

  try {
    const body = await request.json();
    const { userId, groupId, permissionId, domainScope, contextScope, dataContractScope, force } = body;

    if (!userId && !groupId) {
      return NextResponse.json({ error: "Either userId or groupId is required" }, { status: 400 });
    }
    if (userId && groupId) {
      return NextResponse.json({ error: "Provide either userId or groupId, not both" }, { status: 400 });
    }
    if (!permissionId) {
      return NextResponse.json({ error: "permissionId (number) is required" }, { status: 400 });
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
          actorId: session!.user!.email!,
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
      actorId: session!.user!.email!,
      sessionId,
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
