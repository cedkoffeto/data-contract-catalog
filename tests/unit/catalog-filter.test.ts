import { describe, expect, it } from "vitest";
import {
  matchCardsToPolicies,
  normalizePolicies,
  policyMatches,
  type PolicyRow,
} from "@/src/lib/catalog-filter";
import type { CatalogCard } from "@/src/lib/types";

function makeCard(partial: Partial<CatalogCard>): CatalogCard {
  return {
    slug: "orders",
    title: "Orders",
    version: "1.0.0",
    owner: "platform",
    description: "",
    maturity: "silver",
    domain: "crm",
    context: "claims",
    assetType: "table",
    searchData: "",
    href: "/contracts/orders",
    accessible: true,
    ...partial,
  };
}

function policy(partial: Partial<PolicyRow> = {}): PolicyRow {
  return {
    domain_scope: null,
    context_scope: null,
    data_contract_scope: null,
    ...partial,
  };
}

describe("normalizePolicies", () => {
  it("flags a wildcard when every scope is empty", () => {
    const { hasWildcard } = normalizePolicies([policy()]);
    expect(hasWildcard).toBe(true);
  });

  it("does not flag wildcard when any scope is set", () => {
    const { hasWildcard } = normalizePolicies([policy({ domain_scope: "crm" })]);
    expect(hasWildcard).toBe(false);
  });

  it("normalizes scope casing and whitespace", () => {
    const { bySlug, byDomain } = normalizePolicies([
      policy({ domain_scope: "  CRM ", data_contract_scope: "Orders" }),
    ]);
    expect([...bySlug.keys()]).toEqual(["orders"]);
    expect([...byDomain.keys()]).toEqual(["crm"]);
  });

  it("indexes a slug-only policy by slug", () => {
    const { bySlug, byDomain, byDomainContext } = normalizePolicies([
      policy({ data_contract_scope: "orders" }),
    ]);
    expect(bySlug.has("orders")).toBe(true);
    expect(byDomain.size).toBe(0);
    expect(byDomainContext.size).toBe(0);
  });

  it("indexes a domain-only policy by domain", () => {
    const { bySlug, byDomain, byDomainContext } = normalizePolicies([
      policy({ domain_scope: "crm" }),
    ]);
    expect(byDomain.get("crm")).toHaveLength(1);
    expect(bySlug.size).toBe(0);
    expect(byDomainContext.size).toBe(0);
  });

  it("indexes domain+context under a composite key and the domain", () => {
    const { byDomain, byDomainContext } = normalizePolicies([
      policy({ domain_scope: "crm", context_scope: "claims" }),
    ]);
    expect(byDomainContext.get("crm||claims")).toHaveLength(1);
    expect(byDomain.get("crm")).toHaveLength(1);
  });
});

describe("policyMatches", () => {
  const np = { domain: "crm", context: "claims", slug: "orders" };

  it("matches when every non-empty scope matches", () => {
    expect(policyMatches(np, "crm", "claims", "orders")).toBe(true);
  });

  it("rejects on domain mismatch", () => {
    expect(policyMatches(np, "sales", "claims", "orders")).toBe(false);
  });

  it("rejects on context mismatch", () => {
    expect(policyMatches(np, "crm", "billing", "orders")).toBe(false);
  });

  it("rejects on slug mismatch", () => {
    expect(policyMatches(np, "crm", "claims", "customers")).toBe(false);
  });
});

describe("matchCardsToPolicies", () => {
  const cards = [
    makeCard({ slug: "orders", domain: "crm", context: "claims" }),
    makeCard({ slug: "customers", domain: "crm", context: "claims" }),
    makeCard({ slug: "billing", domain: "finance", context: "invoicing" }),
  ];

  it("returns an empty set when there are no policies", () => {
    expect(matchCardsToPolicies(cards, [])).toEqual(new Set());
  });

  it("returns every slug when a wildcard policy exists", () => {
    expect(matchCardsToPolicies(cards, [policy()])).toEqual(
      new Set(["orders", "customers", "billing"]),
    );
  });

  it("matches a slug-only policy regardless of domain/context", () => {
    const result = matchCardsToPolicies(cards, [policy({ data_contract_scope: "orders" })]);
    expect(result).toEqual(new Set(["orders"]));
  });

  it("matches a domain-only policy across all contexts", () => {
    const result = matchCardsToPolicies(cards, [policy({ domain_scope: "crm" })]);
    expect(result).toEqual(new Set(["orders", "customers"]));
  });

  it("matches a domain+context policy within that context only", () => {
    const result = matchCardsToPolicies(cards, [
      policy({ domain_scope: "crm", context_scope: "claims" }),
    ]);
    expect(result).toEqual(new Set(["orders", "customers"]));
  });

  it("matches a full-scope policy on the single contract only", () => {
    const result = matchCardsToPolicies(cards, [
      policy({ domain_scope: "crm", context_scope: "claims", data_contract_scope: "customers" }),
    ]);
    expect(result).toEqual(new Set(["customers"]));
  });

  it("matches case-insensitively against card scopes", () => {
    const result = matchCardsToPolicies(
      [makeCard({ slug: "ORDERS", domain: "CRM", context: "Claims" })],
      [policy({ domain_scope: "crm", context_scope: "claims", data_contract_scope: "orders" })],
    );
    expect(result).toEqual(new Set(["ORDERS"]));
  });
});
