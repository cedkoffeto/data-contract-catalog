import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { execute, query } from "@/src/lib/db";
import { createNotification } from "@/src/lib/notifications";
import { getAdminUserIds } from "@/src/lib/rbac";
import { writeAuditLog } from "@/src/lib/audit";
import { extractSessionId } from "@/src/lib/audit-session";

type AccessRequestPermission = "reader" | "editor";

const ACCESS_REQUEST_PERMISSIONS = new Set<AccessRequestPermission>(["reader", "editor"]);

function normalizeRequestedPermission(value: unknown): AccessRequestPermission {
  return value === "editor" ? "editor" : "reader";
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { domain, context, dataContract, message, requestedPermission: requestedPermissionValue } = body;
    const requestedPermission = normalizeRequestedPermission(requestedPermissionValue);

    if (!domain && !context && !dataContract) {
      return NextResponse.json({ error: "Specify at least a domain, context, or data contract" }, { status: 400 });
    }

    if (requestedPermissionValue && !ACCESS_REQUEST_PERMISSIONS.has(requestedPermissionValue as AccessRequestPermission)) {
      return NextResponse.json({ error: "Invalid requested permission" }, { status: 400 });
    }

    const result = await execute(
      `INSERT INTO access_requests (user_id, domain, context, data_contract, requested_permission, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, domain ?? "", context ?? "", dataContract ?? "", requestedPermission, message ?? ""],
    );

    const sessionId = extractSessionId(request);

    writeAuditLog({
      action: "access_request.create",
      actorId: userId,
      targetType: "contract",
      targetId: dataContract || "__unknown__",
      details: { domain, context, requestedPermission, message },
      sessionId,
    }).catch(() => {});

    // Notify all admins
    const adminIds = await getAdminUserIds();
    const targetParts = [domain, context, dataContract].filter(Boolean).join(" / ");
    for (const adminId of adminIds) {
      await createNotification({
        userId: adminId,
        contractSlug: dataContract || "__access_request__",
        type: "access_request",
        title: `Access request from ${userId}`,
        message: `Requested ${requestedPermission} access to ${targetParts}${message ? `: ${message}` : ""}`,
      });
    }

    return NextResponse.json({ id: result.changes }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create access request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const adminIds = await getAdminUserIds();
  if (!adminIds.includes(userId)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

    const items = await query<{
      id: number;
      user_id: string;
      domain: string;
      context: string;
      data_contract: string;
      requested_permission: AccessRequestPermission;
      message: string;
      status: string;
      created_at: string;
    }>(
      `SELECT id, user_id, domain, context, data_contract, requested_permission, message, status, created_at
       FROM access_requests
       ORDER BY created_at DESC`,
    );

  return NextResponse.json({ items });
}
