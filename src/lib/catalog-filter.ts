import { auth } from "@/src/auth";
import { getUserPermissions, type Permission } from "@/src/lib/rbac";
import { query } from "@/src/lib/db";
import type { CatalogCard } from "@/src/lib/types";

export async function getSessionPermissions(): Promise<{
  permissions: Permission[];
  canEdit: boolean;
  userName: string | null;
}> {
  const session = await auth();
  const userName = session?.user?.name ?? null;
  const permissions = userName ? await getUserPermissions(userName) : [];

  return {
    permissions,
    canEdit: permissions.includes("write") || permissions.includes("admin"),
    userName,
  };
}

type PolicyRow = {
  domain_scope: string | null;
  context_scope: string | null;
};

/**
 * Filters catalog cards using fine-grained access control (batched, single DB query).
 * User must have at least 'reader' on the card's (domain, context).
 * Admin users bypass the check entirely.
 */
export async function filterCatalogCards(
  userId: string,
  cards: CatalogCard[],
  permissions: Permission[],
): Promise<CatalogCard[]> {
  if (permissions.includes("admin")) return cards;

  const policies = await query<PolicyRow>(
    `SELECT DISTINCT ap.domain_scope, ap.context_scope
     FROM access_policies ap
     JOIN permissions p ON p.id = ap.permission_id
     WHERE (
       ap.user_id = ?
       OR ap.group_id IN (SELECT ug.group_id FROM user_group ug WHERE ug.user_id = ?)
     )`,
    [userId, userId],
  );

  const anyPolicyExists = await query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM access_policies",
  );
  const isFreshInstall = (anyPolicyExists[0]?.c ?? 0) === 0;
  if (isFreshInstall) return cards;

  const hasGlobalAccess = policies.some(
    (p) => p.domain_scope === null && p.context_scope === null,
  );
  if (hasGlobalAccess) return cards;

  return cards.filter((card) => {
    const domain = card.domain?.toLowerCase() ?? "";
    const context = card.context?.toLowerCase() ?? "";

    return policies.some((p) => {
      const pd = p.domain_scope?.toLowerCase() ?? null;
      const pc = p.context_scope?.toLowerCase() ?? null;

      if (pd === null && pc === null) return true;
      if (pd === domain && pc === null) return true;
      if (pd === domain && pc === context) return true;

      return false;
    });
  });
}

/**
 * Returns a Set of card slugs the user is allowed to access.
 * Uses the same scope-inheritance logic as filterCatalogCards.
 */
export async function getAccessibleSlugs(
  userId: string,
  permissions: Permission[],
  cards: CatalogCard[],
): Promise<Set<string>> {
  if (permissions.includes("admin")) return new Set(cards.map((c) => c.slug));

  const policies = await query<PolicyRow>(
    `SELECT DISTINCT ap.domain_scope, ap.context_scope
     FROM access_policies ap
     JOIN permissions p ON p.id = ap.permission_id
     WHERE (
       ap.user_id = ?
       OR ap.group_id IN (SELECT ug.group_id FROM user_group ug WHERE ug.user_id = ?)
     )`,
    [userId, userId],
  );

  const anyPolicyExists = await query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM access_policies",
  );
  const isFreshInstall = (anyPolicyExists[0]?.c ?? 0) === 0;
  if (isFreshInstall) return new Set(cards.map((c) => c.slug));

  const hasGlobalAccess = policies.some(
    (p) => p.domain_scope === null && p.context_scope === null,
  );
  if (hasGlobalAccess) return new Set(cards.map((c) => c.slug));

  const accessible = new Set<string>();
  for (const card of cards) {
    const domain = card.domain?.toLowerCase() ?? "";
    const context = card.context?.toLowerCase() ?? "";

    const match = policies.some((p) => {
      const pd = p.domain_scope?.toLowerCase() ?? null;
      const pc = p.context_scope?.toLowerCase() ?? null;

      if (pd === null && pc === null) return true;
      if (pd === domain && pc === null) return true;
      if (pd === domain && pc === context) return true;

      return false;
    });

    if (match) accessible.add(card.slug);
  }
  return accessible;
}
