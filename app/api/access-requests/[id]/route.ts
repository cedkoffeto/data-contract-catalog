export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/auth";
import { getAdminUserIds } from "@/src/lib/rbac";
import { createAccessPolicy } from "@/src/lib/access-control";
import { createNotification } from "@/src/lib/notifications";
import { writeAuditLog } from "@/src/lib/audit";
import { extractSessionId } from "@/src/lib/audit-session";
import { withErrorHandling } from "@/src/lib/with-error-handling";

type AccessRequestPermission = "reader" | "editor";

function permissionNameToPermissionIdName(permission: AccessRequestPermission) {
  return permission === "editor" ? "editor" : "reader";
}

async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.name;
  if (!userId) {
    return apiError("Authentication required", 401);
  }

  const adminIds = await getAdminUserIds();
  if (!adminIds.includes(userId)) {
    return apiError("Admin access required", 403);
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;
  const sessionId = extractSessionId(request);

  if (!["pending", "approved", "rejected"].includes(status)) {
    return apiError("Invalid status", 400);
  }

  const requestedAccessRequest = await prisma.accessRequest.findUnique({
    where: { id: parseInt(id, 10) },
    select: { userId: true, domain: true, context: true, dataContract: true, requestedPermission: true },
  });

  if (!requestedAccessRequest) {
    return apiError("Access request not found", 404);
  }

  // Update status immediately (fast path)
  await prisma.accessRequest.update({
    where: { id: parseInt(id, 10) },
    data: { status, updatedAt: new Date() },
  });

  // Defer slow work: policy creation, audit, notification
  if (requestedAccessRequest) {
    (async () => {
      try {
        if (status === "approved") {
          const requestedPermission = requestedAccessRequest.requestedPermission === "editor" ? "editor" : "reader";
          const permission = await prisma.permission.findFirst({
            where: { name: permissionNameToPermissionIdName(requestedPermission) },
            select: { id: true },
          });
          if (permission) {
            await createAccessPolicy({
              userId: requestedAccessRequest.userId,
              groupId: null,
              permissionId: permission.id,
              domainScope: requestedAccessRequest.domain || null,
              contextScope: requestedAccessRequest.context || null,
              dataContractScope: requestedAccessRequest.dataContract || null,
              actorId: userId,
              force: true,
              sessionId,
            });
          }
        }

        await writeAuditLog({
          action: status === "approved" ? "access_request.approve" : "access_request.deny",
          actorId: userId,
          targetType: "contract",
          targetId: id,
          details: { newStatus: status, requestedPermission: requestedAccessRequest.requestedPermission ?? "reader" },
          sessionId,
        });

        const targetParts = [requestedAccessRequest.domain, requestedAccessRequest.context, requestedAccessRequest.dataContract].filter(Boolean).join(" / ");
        await createNotification({
          userId: requestedAccessRequest.userId,
          contractSlug: requestedAccessRequest.dataContract || "",
          type: "access_request",
          title: status === "approved" ? "Access request approved" : "Access request rejected",
          message: status === "approved"
            ? `Your request for ${requestedAccessRequest.requestedPermission} access to ${targetParts} has been approved.`
            : `Your request for ${requestedAccessRequest.requestedPermission} access to ${targetParts} has been rejected.`,
          metadata: {
            contractSlug: requestedAccessRequest.dataContract || undefined,
            requestStatus: status,
          },
        });
      } catch {
        // Background work failed; status already updated.
      }
    })();
  }

  return NextResponse.json({ success: true });
}

export const PATCH_handler = withErrorHandling(PATCH);
export { PATCH_handler as PATCH };
