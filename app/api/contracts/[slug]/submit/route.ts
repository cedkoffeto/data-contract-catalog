export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import fs from "node:fs";

import { saveContractFile } from "@/src/lib/contract-writer";
import { getContractBySlug } from "@/src/lib/contracts";
import { requireApiAuth } from "@/src/lib/require-auth";
import { authorize } from "@/src/lib/access-control";
import { getAdminUserIds, getUserIdsWithScopeAccess, getUserPermissions } from "@/src/lib/rbac";
import { getSubscribers } from "@/src/lib/subscriptions";
import { createNotification } from "@/src/lib/notifications";
import { extractSessionId } from "@/src/lib/audit-session";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireApiAuth();
    if (session instanceof Response) return session;

    const { slug } = await params;
    const userId = session?.user?.name;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const contract = await getContractBySlug(slug);
    if (!contract) {
      return NextResponse.json({ error: `Contract "${slug}" not found` }, { status: 404 });
    }

    const globalPermissions = await getUserPermissions(userId);
    if (!globalPermissions.includes("admin")) {
      const domain = contract.data.asset?.domain ?? "";
      const ctx = contract.data.asset?.context ?? "";
      const allowed = await authorize(userId, domain, ctx, "write", slug);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = (await req.json()) as { content?: string; commitMessage?: string } | null;
    const content = body?.content;
    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const sessionId = extractSessionId(req);
    const isNew = !fs.existsSync(contract.fullPath);
    await saveContractFile(contract.fullPath, content, userId, body?.commitMessage, sessionId);

    const title = contract.data.asset?.name ?? slug;
    const domain = contract.data.asset?.domain ?? "";
    const context = contract.data.asset?.context ?? "";
    const notified = new Set<string>();

    // Notify all admin users
    const adminUsers = await getAdminUserIds();
    await Promise.allSettled(adminUsers
      .filter((adminId) => adminId !== userId && !notified.has(adminId))
      .map((adminId) => {
        notified.add(adminId);
        return createNotification({
          userId: adminId,
          contractSlug: slug,
          type: isNew ? "contract.created" : "contract.submitted",
          title: isNew ? `New contract: ${title}` : `Contract updated: ${title}`,
          message: isNew
            ? `${userId} created ${title}`
            : `${userId} submitted a new version of ${title}`,
        });
      }),
    );

    // Notify subscribers (excluding admins already notified)
    const subscribers = await getSubscribers(slug);
    await Promise.allSettled(subscribers
      .filter((sub) => sub.user_id !== userId && sub.channel !== "email" && !notified.has(sub.user_id))
      .map((sub) => {
        notified.add(sub.user_id);
        return createNotification({
          userId: sub.user_id,
          contractSlug: slug,
          type: "contract.submitted",
          title: `Contract updated: ${title}`,
          message: `${userId} submitted a new version of ${title}`,
        });
      }),
    );

    // For new contracts, also notify users with scope access
    if (isNew && (domain || context)) {
      const scopeUsers = await getUserIdsWithScopeAccess(domain, context);
      await Promise.allSettled(scopeUsers
        .filter((scopeUserId) => scopeUserId !== userId && !notified.has(scopeUserId))
        .map((scopeUserId) => {
          notified.add(scopeUserId);
          return createNotification({
            userId: scopeUserId,
            contractSlug: slug,
            type: "contract.created",
            title: `New contract: ${title}`,
            message: `${userId} created ${title} (${domain}${context ? ` / ${context}` : ""})`,
          });
        }),
      );
    }

    return NextResponse.json({ success: true, slug });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
