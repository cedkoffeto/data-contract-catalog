import { prisma } from "@/src/lib/prisma";
import { writeAuditLog } from "@/src/lib/audit";

export type NotificationChannel = "in_app" | "email" | "both";

export type Subscription = {
  user_id: string;
  contract_slug: string;
  channel: NotificationChannel;
  created_at: string;
};

export type UserPreference = {
  user_id: string;
  notification_channel: NotificationChannel;
  created_at: string;
  updated_at: string;
};

function toSubscription(s: { userId: string; contractSlug: string; channel: string; createdAt: Date }): Subscription {
  return {
    user_id: s.userId,
    contract_slug: s.contractSlug,
    channel: s.channel as NotificationChannel,
    created_at: s.createdAt.toISOString(),
  };
}

function toUserPreference(p: { userId: string; notificationChannel: string; createdAt: Date; updatedAt: Date }): UserPreference {
  return {
    user_id: p.userId,
    notification_channel: p.notificationChannel as NotificationChannel,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export async function getSubscription(
  userId: string,
  contractSlug: string,
): Promise<Subscription | null> {
  const row = await prisma.subscription.findUnique({
    where: { userId_contractSlug: { userId, contractSlug } },
  });
  return row ? toSubscription(row) : null;
}

export async function getUserPreference(userId: string): Promise<UserPreference | null> {
  const row = await prisma.userPreference.findUnique({ where: { userId } });
  return row ? toUserPreference(row) : null;
}

export async function setUserPreference(userId: string, channel: NotificationChannel): Promise<void> {
  await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, notificationChannel: channel },
    update: { notificationChannel: channel },
  });

  await prisma.subscription.updateMany({
    where: { userId },
    data: { channel },
  });
}

async function resolveChannel(userId: string): Promise<NotificationChannel> {
  const pref = await getUserPreference(userId);
  return pref?.notification_channel ?? "in_app";
}

export async function subscribe(params: {
  userId: string;
  contractSlug: string;
  actorId: string;
  sessionId?: string;
}): Promise<Subscription> {
  const channel = await resolveChannel(params.userId);

  await prisma.subscription.upsert({
    where: { userId_contractSlug: { userId: params.userId, contractSlug: params.contractSlug } },
    create: { userId: params.userId, contractSlug: params.contractSlug, channel },
    update: { channel },
  });

  await writeAuditLog({
    action: "subscription.subscribe",
    actorId: params.actorId,
    targetType: "contract",
    targetId: params.contractSlug,
    details: { channel },
    sessionId: params.sessionId,
  });

  return (await getSubscription(params.userId, params.contractSlug))!;
}

export async function unsubscribe(params: {
  userId: string;
  contractSlug: string;
  actorId: string;
  sessionId?: string;
}): Promise<void> {
  await prisma.subscription.delete({
    where: { userId_contractSlug: { userId: params.userId, contractSlug: params.contractSlug } },
  }).catch(() => {});

  await writeAuditLog({
    action: "subscription.unsubscribe",
    actorId: params.actorId,
    targetType: "contract",
    targetId: params.contractSlug,
    sessionId: params.sessionId,
  });
}

export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  const rows = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSubscription);
}

export async function getSubscribers(contractSlug: string): Promise<Subscription[]> {
  const rows = await prisma.subscription.findMany({ where: { contractSlug } });
  return rows.map(toSubscription);
}
