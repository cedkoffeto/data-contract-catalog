import { prisma } from "@/src/lib/prisma";
import { auth } from "@/src/auth";
import { authorize } from "@/src/lib/access-control";
import { getUserPermissions, type Permission } from "@/src/lib/rbac";
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

type NormalizedPolicy = {
  domain: string;
  context: string;
  slug: string;
};

function normalizePolicies(policies: PolicyRow[]): {
  hasWildcard: boolean;
  bySlug: Map<string, NormalizedPolicy[]>;   // slug → policies referencing it
  byDomain: Map<string, NormalizedPolicy[]>;  // domain → policies
  byDomainContext: Map<string, NormalizedPolicy[]>; // "domain||context" → policies
} {
  let hasWildcard = false;
  const bySlug = new Map<string, NormalizedPolicy[]>();
  const byDomain = new Map<string, NormalizedPolicy[]>();
  const byDomainContext = new Map<string, NormalizedPolicy[]>();

  for (const p of policies) {
    const domain = (p.domain_scope ?? "").toLowerCase().trim();
    const context = (p.context_scope ?? "").toLowerCase().trim();
    const slug = (p.data_contract_scope ?? "").toLowerCase().trim();

    if (!domain && !context && !slug) { hasWildcard = true; continue; }

    const np: NormalizedPolicy = { domain, context, slug };

    if (slug && !domain && !context) {
      // Pattern 2: slug only — lookup by slug
      addToMap(bySlug, slug, np);
    } else if (slug && domain && !context) {
      // Pattern 6: domain + slug
      addToMap(bySlug, slug, np);
      addToMap(byDomain, domain, np);
    } else if (domain && !context && !slug) {
      // Pattern 3: domain only
      addToMap(byDomain, domain, np);
    } else if (domain && context && !slug) {
      // Pattern 4: domain + context
      addToMap(byDomainContext, `${domain}||${context}`, np);
      addToMap(byDomain, domain, np);
    } else if (domain && context && slug) {
      // Pattern 5: domain + context + slug
      addToMap(bySlug, slug, np);
      addToMap(byDomainContext, `${domain}||${context}`, np);
      addToMap(byDomain, domain, np);
    }
  }

  return { hasWildcard, bySlug, byDomain, byDomainContext };
}

function addToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  let arr = map.get(key);
  if (!arr) { arr = []; map.set(key, arr); }
  arr.push(value);
}

function policyMatches(np: NormalizedPolicy, domain: string, context: string, slug: string): boolean {
  if (np.slug && np.slug !== slug) return false;
  if (np.domain && np.domain !== domain) return false;
  if (np.context && np.context !== context) return false;
  return true;
}

const policiesCache = new Map<string, { promise: Promise<PolicyRow[]>; ts: number }>();
const POLICIES_CACHE_TTL = 60_000;

async function fetchUserPolicies(
  userId: string,
  permissionFilter?: string[],
): Promise<PolicyRow[]> {
  const key = permissionFilter ? `${userId}|${permissionFilter.sort().join(",")}` : userId;
  const cached = policiesCache.get(key);
  if (cached && Date.now() - cached.ts < POLICIES_CACHE_TTL) return cached.promise;
  policiesCache.delete(key);

  const where: Record<string, unknown> = {
    OR: [
      { userId },
      { group: { members: { some: { userId } } } },
    ],
  };
  if (permissionFilter) {
    where.permission = { name: { in: permissionFilter } };
  }

  const promise = prisma.accessPolicy.findMany({
    where,
    select: { domainScope: true, contextScope: true, dataContractScope: true },
    distinct: ["domainScope", "contextScope", "dataContractScope"],
  }).then((rows) =>
    rows.map((r) => ({
      domain_scope: r.domainScope,
      context_scope: r.contextScope,
      data_contract_scope: r.dataContractScope,
    }))
  );

  policiesCache.set(key, { promise, ts: Date.now() });
  return promise;
}

async function userHasGlobalAccess(): Promise<boolean> {
  const count = await prisma.accessPolicy.count();
  return count === 0;
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
  if (policies.length === 0 && await userHasGlobalAccess()) return cards;

  const lookup = normalizePolicies(policies);
  if (lookup.hasWildcard) return cards;

  return cards.filter((card) => {
    const domain = card.domain?.toLowerCase().trim() ?? "";
    const context = card.context?.toLowerCase().trim() ?? "";
    const slug = card.slug.toLowerCase();

    const bySlug = lookup.bySlug.get(slug);
    if (bySlug?.some((np) => policyMatches(np, domain, context, slug))) return true;

    const dcKey = `${domain}||${context}`;
    const byDomainContext = lookup.byDomainContext.get(dcKey);
    if (byDomainContext?.some((np) => policyMatches(np, domain, context, slug))) return true;

    const byDomain = lookup.byDomain.get(domain);
    if (byDomain?.some((np) => policyMatches(np, domain, context, slug))) return true;

    return false;
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
  return getMatchingSlugs(userId, permissions, cards);
}

export async function getEditableSlugs(
  userId: string,
  permissions: Permission[],
  cards: CatalogCard[],
): Promise<Set<string>> {
  return getMatchingSlugs(userId, permissions, cards, ["admin", "editor"]);
}

export async function getAccessibleAndEditableSlugs(
  userId: string,
  permissions: Permission[],
  cards: CatalogCard[],
): Promise<{ accessible: Set<string>; editable: Set<string> }> {
  if (permissions.includes("admin")) {
    const all = new Set(cards.map((c) => c.slug));
    return { accessible: all, editable: all };
  }

  const [allPolicies, editPolicies] = await Promise.all([
    fetchUserPolicies(userId),
    fetchUserPolicies(userId, ["admin", "editor"]),
  ]);

  const globalAccess = allPolicies.length === 0 && await userHasGlobalAccess();
  if (globalAccess) {
    const all = new Set(cards.map((c) => c.slug));
    return { accessible: all, editable: all };
  }

  const accessible = matchCardsToPolicies(cards, allPolicies);
  const editable = matchCardsToPolicies(cards, editPolicies);
  return { accessible, editable };
}

function matchCardsToPolicies(cards: CatalogCard[], policies: PolicyRow[]): Set<string> {
  if (policies.length === 0) return new Set();
  const lookup = normalizePolicies(policies);
  if (lookup.hasWildcard) return new Set(cards.map((c) => c.slug));

  const matching = new Set<string>();
  for (const card of cards) {
    const domain = card.domain?.toLowerCase().trim() ?? "";
    const context = card.context?.toLowerCase().trim() ?? "";
    const slug = card.slug.toLowerCase();

    const bySlug = lookup.bySlug.get(slug);
    if (bySlug?.some((np) => policyMatches(np, domain, context, slug))) { matching.add(card.slug); continue; }

    const dcKey = `${domain}||${context}`;
    const byDomainContext = lookup.byDomainContext.get(dcKey);
    if (byDomainContext?.some((np) => policyMatches(np, domain, context, slug))) { matching.add(card.slug); continue; }

    const byDomain = lookup.byDomain.get(domain);
    if (byDomain?.some((np) => policyMatches(np, domain, context, slug))) { matching.add(card.slug); continue; }
  }
  return matching;
}

async function getMatchingSlugs(
  userId: string,
  permissions: Permission[],
  cards: CatalogCard[],
  permissionFilter?: string[],
): Promise<Set<string>> {
  if (permissions.includes("admin")) return new Set(cards.map((c) => c.slug));

  const policies = await fetchUserPolicies(userId, permissionFilter);
  if (policies.length === 0 && await userHasGlobalAccess()) return new Set(cards.map((c) => c.slug));

  const lookup = normalizePolicies(policies);
  if (lookup.hasWildcard) return new Set(cards.map((c) => c.slug));

  const matching = new Set<string>();
  for (const card of cards) {
    const domain = card.domain?.toLowerCase().trim() ?? "";
    const context = card.context?.toLowerCase().trim() ?? "";
    const slug = card.slug.toLowerCase();

    const bySlug = lookup.bySlug.get(slug);
    if (bySlug?.some((np) => policyMatches(np, domain, context, slug))) { matching.add(card.slug); continue; }

    const dcKey = `${domain}||${context}`;
    const byDomainContext = lookup.byDomainContext.get(dcKey);
    if (byDomainContext?.some((np) => policyMatches(np, domain, context, slug))) { matching.add(card.slug); continue; }

    const byDomain = lookup.byDomain.get(domain);
    if (byDomain?.some((np) => policyMatches(np, domain, context, slug))) { matching.add(card.slug); continue; }
  }
  return matching;
}
