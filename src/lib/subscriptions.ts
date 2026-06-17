import { query, execute } from "@/src/lib/db";
import { writeAuditLog } from "@/src/lib/audit";

export type NotificationChannel = "in_app" | "email" | "both";

export type Subscription = {
  user_id: string;
  contract_slug: string;
  channel: NotificationChannel;
  created_at: string;
};

export async function getSubscription(
  userId: string,
  contractSlug: string,
): Promise<Subscription | null> {
  const rows = await query<Subscription>(
    "SELECT user_id, contract_slug, channel, created_at FROM subscriptions WHERE user_id = ? AND contract_slug = ?",
    [userId, contractSlug],
  );
  return rows[0] ?? null;
}

export async function subscribe(params: {
  userId: string;
  contractSlug: string;
  channel: NotificationChannel;
  actorId: string;
}): Promise<Subscription> {
  await execute(
    `INSERT INTO subscriptions (user_id, contract_slug, channel) VALUES (?, ?, ?)
     ON CONFLICT(user_id, contract_slug) DO UPDATE SET channel = excluded.channel`,
    [params.userId, params.contractSlug, params.channel],
  );

  await writeAuditLog({
    action: "subscription.subscribe",
    actorId: params.actorId,
    targetType: "contract",
    targetId: params.contractSlug,
    details: { channel: params.channel },
  });

  return (await getSubscription(params.userId, params.contractSlug))!;
}

export async function unsubscribe(params: {
  userId: string;
  contractSlug: string;
  actorId: string;
}): Promise<void> {
  await execute(
    "DELETE FROM subscriptions WHERE user_id = ? AND contract_slug = ?",
    [params.userId, params.contractSlug],
  );

  await writeAuditLog({
    action: "subscription.unsubscribe",
    actorId: params.actorId,
    targetType: "contract",
    targetId: params.contractSlug,
  });
}

export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  return query<Subscription>(
    "SELECT user_id, contract_slug, channel, created_at FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
}

export async function getSubscribers(contractSlug: string): Promise<Subscription[]> {
  return query<Subscription>(
    "SELECT user_id, contract_slug, channel, created_at FROM subscriptions WHERE contract_slug = ?",
    [contractSlug],
  );
}
