import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { execute, query } from "@/src/lib/db";
import { getAdminUserIds } from "@/src/lib/rbac";
import { createAccessPolicy } from "@/src/lib/access-control";
import { writeAuditLog } from "@/src/lib/audit";
import { extractSessionId } from "@/src/lib/audit-session";

type AccessRequestPermission = "reader" | "editor";

function permissionNameToPermissionIdName(permission: AccessRequestPermission) {
  return permission === "editor" ? "editor" : "reader";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const adminIds = await getAdminUserIds();
  if (!adminIds.includes(userId)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;
  const sessionId = extractSessionId(request);

  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let requestedAccessRequest: { user_id: string; domain: string; context: string; data_contract: string; requested_permission: AccessRequestPermission } | null = null;

  if (status === "approved") {
    const rows = await query<{ user_id: string; domain: string; context: string; data_contract: string; requested_permission: AccessRequestPermission }>(
      "SELECT user_id, domain, context, data_contract, requested_permission FROM access_requests WHERE id = ?",
      [parseInt(id, 10)],
    );
    requestedAccessRequest = rows[0] ?? null;
    if (requestedAccessRequest) {
      const requestedPermission = requestedAccessRequest.requested_permission === "editor" ? "editor" : "reader";
      const permRows = await query<{ id: number }>(`SELECT id FROM permissions WHERE name = ?`, [permissionNameToPermissionIdName(requestedPermission)]);
      const permissionId = permRows[0]?.id;
      if (permissionId) {
        await createAccessPolicy({
          userId: requestedAccessRequest.user_id,
          groupId: null,
          permissionId,
          domainScope: requestedAccessRequest.domain || null,
          contextScope: requestedAccessRequest.context || null,
          dataContractScope: requestedAccessRequest.data_contract || null,
          actorId: userId,
          force: true,
          sessionId,
        });
      }
    }
  }

  await execute(
    "UPDATE access_requests SET status = ? WHERE id = ?",
    [status, parseInt(id, 10)],
  );

  writeAuditLog({
    action: status === "approved" ? "access_request.approve" : "access_request.deny",
    actorId: userId,
    targetType: "contract",
    targetId: id,
    details: { newStatus: status, requestedPermission: requestedAccessRequest?.requested_permission ?? "reader" },
    sessionId,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
