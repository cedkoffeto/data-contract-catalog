import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { execute, query } from "@/src/lib/db";
import { getAdminUserIds } from "@/src/lib/rbac";
import { createAccessPolicy } from "@/src/lib/access-control";
import { writeAuditLog } from "@/src/lib/audit";
import { extractSessionId } from "@/src/lib/audit-session";

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

  if (status === "approved") {
    const rows = await query<{ user_id: string; domain: string; context: string; data_contract: string }>(
      "SELECT user_id, domain, context, data_contract FROM access_requests WHERE id = ?",
      [parseInt(id, 10)],
    );
    const req = rows[0];
    if (req) {
      const permRows = await query<{ id: number }>("SELECT id FROM permissions WHERE name = 'reader'");
      const readerPermId = permRows[0]?.id;
      if (readerPermId) {
        await createAccessPolicy({
          userId: req.user_id,
          groupId: null,
          permissionId: readerPermId,
          domainScope: req.domain || null,
          contextScope: req.context || null,
          dataContractScope: req.data_contract || null,
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
    details: { newStatus: status },
    sessionId,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
