import { prisma } from "@/src/lib/prisma";
import type { UserProfile } from "@/src/lib/types";

export async function upsertUserProfile(params: {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<void> {
  await prisma.userProfile.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      firstName: params.firstName ?? "",
      lastName: params.lastName ?? "",
    },
    update: {
      firstName: params.firstName ?? "",
      lastName: params.lastName ?? "",
    },
  });
}

export async function listUserProfiles(search: string): Promise<UserProfile[]> {
  const q = search.trim().toLowerCase();

  const [userGroupIds, policyIds, notifIds, commentIds, subIds] = await Promise.all([
    prisma.userGroup.findMany({ select: { userId: true }, distinct: ["userId"] }),
    prisma.accessPolicy.findMany({ where: { userId: { not: null } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.notification.findMany({ select: { userId: true }, distinct: ["userId"] }),
    prisma.contractComment.findMany({ select: { userId: true }, distinct: ["userId"] }),
    prisma.subscription.findMany({ select: { userId: true }, distinct: ["userId"] }),
  ]);

  const userIds = [...new Set([
    ...userGroupIds.map((u) => u.userId),
    ...policyIds.map((u) => u.userId ?? ""),
    ...notifIds.map((u) => u.userId),
    ...commentIds.map((u) => u.userId),
    ...subIds.map((u) => u.userId),
  ])];

  if (userIds.length === 0) return [];

  const profileRows = await prisma.userProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, firstName: true, lastName: true },
  });

  const profiles = new Map<string, { userId: string; firstName: string; lastName: string }>();
  for (const row of profileRows) {
    profiles.set(row.userId, {
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
    });
  }

  for (const userId of userIds) {
    if (!profiles.has(userId)) {
      profiles.set(userId, {
        userId,
        firstName: userId,
        lastName: "",
      });
    }
  }

  return [...profiles.values()]
    .filter((profile) => {
      if (!q) return true;
      return [
        profile.userId,
        profile.firstName,
        profile.lastName,
        `${profile.firstName} ${profile.lastName}`,
      ].some((value) => value.toLowerCase().includes(q));
    })
    .map((profile) => ({
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile.firstName || profile.lastName || profile.userId,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .slice(0, 20);
}
