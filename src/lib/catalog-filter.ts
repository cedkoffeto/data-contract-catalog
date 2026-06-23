import { auth } from "@/src/auth";
import { authorize } from "@/src/lib/access-control";
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

export async function canEditContract(
  userId: string | null | undefined,
  permissions: Permission[],
  domain: string,
  context: string,
  dataContract?: string,
): Promise<boolean> {
  if (!userId) return false;
  if (permissions.includes("write") || permissions.includes("admin")) return true;
  return authorize(userId, domain, context, "write", dataContract);
}

type PolicyRow = {
  domain_scope: string | null;
  context_scope: string | null;
  data_contract_scope: string | null;
};

function scopeMatchesPolicy(
  domain: string,
  context: string,
  slug: string,
  p: PolicyRow,
): boolean {
  const pd = (p.domain_scope ?? "").toLowerCase().trim();
  const pc = (p.context_scope ?? "").toLowerCase().trim();
  const pdc = (p.data_contract_scope ?? "").toLowerCase().trim();
  const lcSlug = slug.toLowerCase();

  return (
    (pd === "" && pc === "" && pdc === "") ||
    (pd === "" && pc === "" && pdc === lcSlug) ||
    (pd === domain && pc === "" && pdc === "") ||
    (pd === domain && pc === context && pdc === "") ||
    (pd === domain && pc === context && pdc === lcSlug) ||
    (pd === domain && pc === "" && pdc === lcSlug)
  );
}

async function fetchUserPolicies(
  userId: string,
  permissionFilter?: string[],
): Promise<PolicyRow[]> {
  return query<PolicyRow>(
    `SELECT DISTINCT ap.domain_scope, ap.context_scope, ap.data_contract_scope
     FROM access_policies ap
     JOIN permissions p ON p.id = ap.permission_id
     WHERE (
       ap.user_id = ?
       OR ap.group_id IN (SELECT ug.group_id FROM user_group ug WHERE ug.user_id = ?)
     )
     ${permissionFilter ? `AND p.name IN (${permissionFilter.map(() => "?").join(",")})` : ""}`,
    permissionFilter
      ? [userId, userId, ...permissionFilter]
      : [userId, userId],
  );
}

async function userHasGlobalAccess(userId: string): Promise<boolean> {
  const count = await query<{ c: number }>("SELECT COUNT(*) AS c FROM access_policies");
  if ((count[0]?.c ?? 0) === 0) return true;
  return false;
}

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

  const policies = await fetchUserPolicies(userId);
  if (await userHasGlobalAccess(userId)) return cards;
  if (policies.some((p) => (p.domain_scope ?? "") === "" && (p.context_scope ?? "") === "" && (p.data_contract_scope ?? "") === "")) return cards;

  return cards.filter((card) =>
    policies.some((p) => scopeMatchesPolicy(
      card.domain?.toLowerCase().trim() ?? "",
      card.context?.toLowerCase().trim() ?? "",
      card.slug,
      p,
    ))
  );
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
  return getMatchingSlugs(userId, permissions, cards);
}

export async function getEditableSlugs(
  userId: string,
  permissions: Permission[],
  cards: CatalogCard[],
): Promise<Set<string>> {
  return getMatchingSlugs(userId, permissions, cards, ["admin", "editor"]);
}

async function getMatchingSlugs(
  userId: string,
  permissions: Permission[],
  cards: CatalogCard[],
  permissionFilter?: string[],
): Promise<Set<string>> {
  if (permissions.includes("admin")) return new Set(cards.map((c) => c.slug));

  const policies = await fetchUserPolicies(userId, permissionFilter);
  if (await userHasGlobalAccess(userId)) return new Set(cards.map((c) => c.slug));
  if (policies.some((p) => (p.domain_scope ?? "") === "" && (p.context_scope ?? "") === "" && (p.data_contract_scope ?? "") === "")) return new Set(cards.map((c) => c.slug));

  const matching = new Set<string>();
  for (const card of cards) {
    if (policies.some((p) => scopeMatchesPolicy(
      card.domain?.toLowerCase().trim() ?? "",
      card.context?.toLowerCase().trim() ?? "",
      card.slug,
      p,
    ))) {
      matching.add(card.slug);
    }
  }
  return matching;
}
