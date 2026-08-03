export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/auth";
import { createNotification } from "@/src/lib/notifications";
import { getAdminUserIds, isAdmin } from "@/src/lib/rbac";
import { writeAuditLog } from "@/src/lib/audit";
import { extractSessionId } from "@/src/lib/audit-session";
import { withErrorHandling } from "@/src/lib/with-error-handling";

type AccessRequestPermission = "reader" | "editor";

const ACCESS_REQUEST_PERMISSIONS = new Set<AccessRequestPermission>(["reader", "editor"]);

function normalizeRequestedPermission(value: unknown): AccessRequestPermission {
  return value === "editor" ? "editor" : "reader";
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  try {
    const body = await request.json();
    const { domain, context, dataContract, message, requestedPermission: requestedPermissionValue } = body;
    const requestedPermission = normalizeRequestedPermission(requestedPermissionValue);

    if (!domain && !context && !dataContract) {
      return apiError("Specify at least a domain, context, or data contract", 400);
    }

    if (requestedPermissionValue && !ACCESS_REQUEST_PERMISSIONS.has(requestedPermissionValue as AccessRequestPermission)) {
      return apiError("Invalid requested permission", 400);
    }

    const created = await prisma.accessRequest.create({
      data: {
        userId,
        domain: domain ?? "",
        context: context ?? "",
        dataContract: dataContract ?? "",
        requestedPermission,
        message: message ?? "",
      },
    });

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
    await Promise.allSettled(adminIds.map((adminId) =>
      createNotification({
        userId: adminId,
        contractSlug: dataContract || "",
        type: "access_request",
        title: `Access request from ${userId}`,
        message: `Requested ${requestedPermission} access to ${targetParts}${message ? `: ${message}` : ""}`,
        metadata: {
          path: "/admin",
          contractSlug: dataContract || undefined,
          requestStatus: "pending",
        },
      }),
    ));

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create access request";
    return apiError(msg, 400);
  }
}

async function GET() {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  if (!await isAdmin(userId)) {
    return apiError("Admin access required", 403);
  }

  const rows = await prisma.accessRequest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      domain: true,
      context: true,
      dataContract: true,
      requestedPermission: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const items = rows.map((r) => ({
    id: r.id,
    user_id: r.userId,
    domain: r.domain,
    context: r.context,
    data_contract: r.dataContract,
    requested_permission: r.requestedPermission,
    message: r.message,
    status: r.status,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ items });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
