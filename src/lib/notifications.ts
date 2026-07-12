import { prisma } from "@/src/lib/prisma";

export type NotificationRow = {
  id: number;
  user_id: string;
  contract_slug: string;
  type: string;
  title: string;
  message: string;
  metadata: string;
  is_read: number;
  created_at: string;
};

function toRow(n: {
  id: number; userId: string; contractSlug: string; type: string;
  title: string; message: string; metadata: string; isRead: boolean; createdAt: Date;
}): NotificationRow {
  return {
    id: n.id,
    user_id: n.userId,
    contract_slug: n.contractSlug,
    type: n.type,
    title: n.title,
    message: n.message,
    metadata: n.metadata,
    is_read: n.isRead ? 1 : 0,
    created_at: n.createdAt.toISOString(),
  };
}

export async function getUserNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toRow);
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(
  ids: number[],
  userId: string,
): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { isRead: true },
  });
}

export async function markAsUnread(
  ids: number[],
  userId: string,
): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { isRead: false },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function createNotification(params: {
  userId: string;
  contractSlug: string;
  type?: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      contractSlug: params.contractSlug,
      type: params.type ?? "info",
      title: params.title,
      message: params.message ?? "",
      metadata: JSON.stringify(params.metadata ?? {}),
    },
  });
}
