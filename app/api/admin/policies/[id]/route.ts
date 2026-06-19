export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/require-admin";
import { auth } from "@/src/auth";
import {
  checkPolicyConflicts,
  deleteAccessPolicy,
  findNarrowerPolicies,
  getAccessPolicy,
  listPermissions,
  updateAccessPolicy,
} from "@/src/lib/access-control";
import { extractSessionId } from "@/src/lib/audit-session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const policyId = parseInt(id, 10);

  if (isNaN(policyId)) {
    return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { permissionId, domainScope, contextScope, dataContractScope, force } = body;
    const sessionId = extractSessionId(request);

    if (!permissionId) {
      return NextResponse.json({ error: "permissionId is required" }, { status: 400 });
    }

    const current = await getAccessPolicy(policyId);
    if (!current) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const conflict = await checkPolicyConflicts({
      userId: current.user_id,
      groupId: current.group_id,
      permissionId,
      domainScope: domainScope ?? null,
      contextScope: contextScope ?? null,
      dataContractScope: dataContractScope ?? null,
      excludeId: policyId,
    });

    if (conflict) {
      if (conflict.type === "overlap" && force) {
        await deleteAccessPolicy({ id: conflict.existing.id, actorId: session!.user!.email!, sessionId });
        const policy = await updateAccessPolicy({
          id: policyId,
          permissionId,
          domainScope: domainScope ?? null,
          contextScope: contextScope ?? null,
          dataContractScope: dataContractScope ?? null,
          actorId: session!.user!.email!,
          sessionId,
        });
        return NextResponse.json(policy);
      }

      let affectedPolicies: Array<{ id: number; domain_scope: string | null; context_scope: string | null; data_contract_scope: string | null; permission_name: string }> = [];
      if (conflict.type === "broader") {
        const ids = await findNarrowerPolicies(
          current.user_id, current.group_id,
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
          assignTo: current.user_id ?? `group:${current.group_id}`,
          permissionId,
          permissionName: (await listPermissions()).find((p) => p.id === permissionId)?.name ?? "unknown",
          domainScope: domainScope ?? null,
          contextScope: contextScope ?? null,
          dataContractScope: dataContractScope ?? null,
        },
      }, { status: 409 });
    }

    const policy = await updateAccessPolicy({
      id: policyId,
      permissionId,
      domainScope: domainScope ?? null,
      contextScope: contextScope ?? null,
      dataContractScope: dataContractScope ?? null,
      actorId: session!.user!.email!,
      sessionId,
    });

    return NextResponse.json(policy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const session = await auth();
  const { id } = await params;
  const policyId = parseInt(id, 10);
  const sessionId = extractSessionId(request);

  if (isNaN(policyId)) {
    return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
  }

  try {
    await deleteAccessPolicy({ id: policyId, actorId: session!.user!.email!, sessionId });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete policy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
