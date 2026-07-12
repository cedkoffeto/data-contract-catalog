import { execute, query } from "@/src/lib/db";

export type UserContractPreferences = {
  isFavorite: boolean;
  isPinned: boolean;
};

export async function getUserContractPreferences(userId: string, contractSlug: string): Promise<UserContractPreferences> {
  const rows = await query<{ is_favorite: boolean; is_pinned: boolean }>(
    `SELECT is_favorite, is_pinned FROM user_contract_preferences WHERE user_id = ? AND contract_slug = ?`,
    [userId, contractSlug],
  );

  return {
    isFavorite: rows[0]?.is_favorite === true,
    isPinned: rows[0]?.is_pinned === true,
  };
}

export async function updateUserContractPreferences(
  userId: string,
  contractSlug: string,
  prefs: Partial<UserContractPreferences>,
): Promise<UserContractPreferences> {
  const current = await getUserContractPreferences(userId, contractSlug);
  const merged = { ...current, ...prefs };

  await execute(
    `INSERT INTO user_contract_preferences (user_id, contract_slug, is_favorite, is_pinned, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, contract_slug) DO UPDATE SET
       is_favorite = excluded.is_favorite,
       is_pinned = excluded.is_pinned,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, contractSlug, merged.isFavorite, merged.isPinned],
  );

  return merged;
}

export async function getPinnedSlugs(userId: string): Promise<string[]> {
  const rows = await query<{ contract_slug: string }>(
    "SELECT contract_slug FROM user_contract_preferences WHERE user_id = ? AND is_pinned = true",
    [userId],
  );
  return rows.map((r) => r.contract_slug);
}

export async function getUserFavoriteSlugs(userId: string): Promise<string[]> {
  const rows = await query<{ contract_slug: string }>(
    "SELECT contract_slug FROM user_contract_preferences WHERE user_id = ? AND is_favorite = true",
    [userId],
  );
  return rows.map((r) => r.contract_slug);
}
