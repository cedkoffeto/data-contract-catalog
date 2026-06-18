import { execute, query } from "@/src/lib/db";

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

export async function getUserNotifications(
  userId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  return query<NotificationRow>(
    `SELECT id, user_id, contract_slug, type, title, message, metadata, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit],
  );
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await query<{ c: number }>(
    "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0",
    [userId],
  );
  return rows[0]?.c ?? 0;
}

export async function markAsRead(
  ids: number[],
  userId: string,
): Promise<void> {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");
  await execute(
    `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`,
    [...ids.map(String), userId],
  );
}

export async function markAsUnread(
  ids: number[],
  userId: string,
): Promise<void> {
  if (ids.length === 0) return;

  const placeholders = ids.map(() => "?").join(",");
  await execute(
    `UPDATE notifications SET is_read = 0 WHERE id IN (${placeholders}) AND user_id = ?`,
    [...ids.map(String), userId],
  );
}

export async function markAllAsRead(userId: string): Promise<void> {
  await execute(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [userId],
  );
}

export async function createNotification(params: {
  userId: string;
  contractSlug: string;
  type?: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await execute(
    `INSERT INTO notifications (user_id, contract_slug, type, title, message, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.userId,
      params.contractSlug,
      params.type ?? "info",
      params.title,
      params.message ?? "",
      JSON.stringify(params.metadata ?? {}),
    ],
  );
}
