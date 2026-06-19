import { execute, query } from "@/src/lib/db";
import type { UserProfile } from "@/src/lib/types";

export async function upsertUserProfile(params: {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<void> {
  await execute(
    `INSERT INTO user_profiles (user_id, first_name, last_name, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       updated_at = CURRENT_TIMESTAMP`,
    [params.userId, params.firstName ?? "", params.lastName ?? ""],
  );
}

export async function listUserProfiles(search: string): Promise<UserProfile[]> {
  const q = search.trim().toLowerCase();
  const rows = await query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM user_group WHERE user_id IS NOT NULL
     UNION SELECT DISTINCT user_id FROM access_policies WHERE user_id IS NOT NULL
     UNION SELECT DISTINCT user_id FROM notifications WHERE user_id IS NOT NULL
     UNION SELECT DISTINCT user_id FROM contract_comments WHERE user_id IS NOT NULL
     UNION SELECT DISTINCT user_id FROM subscriptions WHERE user_id IS NOT NULL`,
  );

  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  if (userIds.length === 0) {
    return [];
  }

  const profileRows = await query<{ user_id: string; first_name: string; last_name: string }>(
    `SELECT user_id, first_name, last_name FROM user_profiles WHERE user_id IN (${userIds.map(() => "?").join(",")})`,
    userIds,
  );

  const profiles = new Map<string, { userId: string; firstName: string; lastName: string }>();
  for (const row of profileRows) {
    profiles.set(row.user_id, {
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
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
