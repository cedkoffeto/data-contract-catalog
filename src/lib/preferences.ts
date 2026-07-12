import { prisma } from "@/src/lib/prisma";

export type UserContractPreferences = {
  isFavorite: boolean;
  isPinned: boolean;
};

export async function getUserContractPreferences(userId: string, contractSlug: string): Promise<UserContractPreferences> {
  const row = await prisma.userContractPreference.findUnique({
    where: { userId_contractSlug: { userId, contractSlug } },
  });
  return {
    isFavorite: row?.isFavorite ?? false,
    isPinned: row?.isPinned ?? false,
  };
}

export async function updateUserContractPreferences(
  userId: string,
  contractSlug: string,
  prefs: Partial<UserContractPreferences>,
): Promise<UserContractPreferences> {
  const current = await getUserContractPreferences(userId, contractSlug);
  const merged = { ...current, ...prefs };

  await prisma.userContractPreference.upsert({
    where: { userId_contractSlug: { userId, contractSlug } },
    create: { userId, contractSlug, isFavorite: merged.isFavorite, isPinned: merged.isPinned },
    update: { isFavorite: merged.isFavorite, isPinned: merged.isPinned },
  });

  return merged;
}

export async function getPinnedSlugs(userId: string): Promise<string[]> {
  const rows = await prisma.userContractPreference.findMany({
    where: { userId, isPinned: true },
    select: { contractSlug: true },
  });
  return rows.map((r) => r.contractSlug);
}

export async function getUserFavoriteSlugs(userId: string): Promise<string[]> {
  const rows = await prisma.userContractPreference.findMany({
    where: { userId, isFavorite: true },
    select: { contractSlug: true },
  });
  return rows.map((r) => r.contractSlug);
}
