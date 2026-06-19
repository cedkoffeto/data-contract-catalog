import { execute, query } from "@/src/lib/db";

export async function getUserContractPreferences(userId: string, contractSlug: string): Promise<boolean> {
  const rows = await query<{ is_favorite: number }>(
    `SELECT is_favorite FROM user_contract_preferences WHERE user_id = ? AND contract_slug = ?`,
    [userId, contractSlug],
  );

  return rows[0]?.is_favorite === 1;
}

export async function updateUserContractPreferences(
  userId: string,
  contractSlug: string,
  isFavorite: boolean,
): Promise<boolean> {
  await execute(
    `INSERT INTO user_contract_preferences (user_id, contract_slug, is_favorite, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, contract_slug) DO UPDATE SET
       is_favorite = excluded.is_favorite,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, contractSlug, isFavorite ? 1 : 0],
  );

  return isFavorite;
}
