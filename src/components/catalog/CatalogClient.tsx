"use client";

import { useMemo, useState } from "react";

import { CatalogCard } from "@/src/components/catalog/CatalogCard";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import type { CatalogCard as CatalogCardType } from "@/src/lib/types";

const ALL_DOMAINS = "__all_domains__";
const ALL_CONTEXTS = "__all_contexts__";

function humanize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Non defini";
  }

  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function CatalogClient({ cards }: { cards: CatalogCardType[] }) {
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState(ALL_DOMAINS);
  const [selectedContext, setSelectedContext] = useState(ALL_CONTEXTS);
  const [selectedMaturity, setSelectedMaturity] = useState("all");
  const [showOnlyAccessible, setShowOnlyAccessible] = useState(false);

  const domains = useMemo(() => {
    const unique = new Set(cards.map((card) => card.domain.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const contexts = useMemo(() => {
    const unique = new Set(cards.map((card) => card.context.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const maturities = useMemo(() => {
    const unique = new Set(cards.map((card) => card.maturity.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const visibleCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesSearch = !query || card.searchData.includes(query);
      const matchesDomain = selectedDomain === ALL_DOMAINS || card.domain.trim() === selectedDomain;
      const matchesContext = selectedContext === ALL_CONTEXTS || card.context.trim() === selectedContext;
      const matchesMaturity = selectedMaturity === "all" || card.maturity.trim() === selectedMaturity;
      const matchesAccessible = !showOnlyAccessible || card.accessible;
      return matchesSearch && matchesDomain && matchesContext && matchesMaturity && matchesAccessible;
    });
  }, [cards, search, selectedDomain, selectedContext, selectedMaturity, showOnlyAccessible]);

  const accessibleCount = useMemo(() => cards.filter((c) => c.accessible).length, [cards]);

  const stats = useMemo(
    () => [
      { label: "Contracts", value: cards.length.toString().padStart(2, "0") },
      { label: "Domains", value: domains.length.toString().padStart(2, "0") },
      { label: "Contexts", value: contexts.length.toString().padStart(2, "0") },
      { label: "Maturity tiers", value: maturities.length.toString().padStart(2, "0") }
    ],
    [cards.length, domains.length, contexts.length, maturities.length]
  );

  return (
    <div className="catalog-shell">
      <section className="catalog-header">
        <div>
          <h1 className="catalog-header__title">Catalog</h1>
          <p className="catalog-header__meta">
            {stats.map((stat) => `${stat.value} ${stat.label.toLowerCase()}`).join("  •  ")}
          </p>
        </div>
        <a className="catalog-primary-link" href="/editor">
          New contract
        </a>
      </section>

      <section className="catalog-searchbar">
        <Input
          id="search"
          name="q"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search contract, owner, version or domain"
          wrapperClassName="catalog-filters__search"
          icon={
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          }
        />

        <div className="catalog-domain-row">
          <div className="catalog-domain-row__title">
            <span>Domains</span>
            <span>{visibleCards.length} contracts</span>
          </div>

          <div className="catalog-domain-row__list">
            <Button
              className={selectedDomain === ALL_DOMAINS ? "is-active" : undefined}
              onClick={() => setSelectedDomain(ALL_DOMAINS)}
              variant="chip"
            >
              All domains
            </Button>
            {cards.length > 0 ? (
              <Button
                className={showOnlyAccessible ? "is-active" : undefined}
                onClick={() => setShowOnlyAccessible((v) => !v)}
                variant="chip"
              >
                Accessible only ({accessibleCount}/{cards.length})
              </Button>
            ) : null}
            {domains.map((domain) => (
              <Button
                key={domain}
                className={selectedDomain === domain ? "is-active" : undefined}
                onClick={() => setSelectedDomain(domain)}
                variant="chip"
              >
                {humanize(domain)}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="catalog-layout">
        <aside className="catalog-filters">
          <div className="catalog-filters__heading">
            <h2>Filters</h2>
            {(search || selectedDomain !== ALL_DOMAINS || selectedContext !== ALL_CONTEXTS || selectedMaturity !== "all" || showOnlyAccessible) && (
              <Button
                onClick={() => {
                  setSearch("");
                  setSelectedDomain(ALL_DOMAINS);
                  setSelectedContext(ALL_CONTEXTS);
                  setSelectedMaturity("all");
                  setShowOnlyAccessible(false);
                }}
                variant="outline"
              >
                Reset
              </Button>
            )}
          </div>

          <div className="catalog-filter-group">
            <span className="catalog-filter-group__label">Context</span>
            <div className="catalog-filter-stack">
              <button
                className={selectedContext === ALL_CONTEXTS ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                onClick={() => setSelectedContext(ALL_CONTEXTS)}
                type="button"
              >
                All contexts
              </button>
              {contexts.map((context) => (
                <button
                  key={context}
                  className={selectedContext === context ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                  onClick={() => setSelectedContext(context)}
                  type="button"
                >
                  {humanize(context)}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-filter-group">
            <span className="catalog-filter-group__label">Maturity</span>
            <div className="catalog-filter-stack">
              <button
                className={selectedMaturity === "all" ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                onClick={() => setSelectedMaturity("all")}
                type="button"
              >
                All maturities
              </button>
              {maturities.map((maturity) => (
                <button
                  key={maturity}
                  className={selectedMaturity === maturity ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                  onClick={() => setSelectedMaturity(maturity)}
                  type="button"
                >
                  {humanize(maturity)}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-filter-group">
            <span className="catalog-filter-group__label">Overview</span>
            <div className="catalog-filter-summary">
              {stats.map((stat) => (
                <div key={stat.label} className="catalog-filter-summary__item">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="catalog-results" id="catalog-grid">
          <div className="catalog-results__header">
            <div>
              <h2>Contracts</h2>
              <p className="catalog-results__meta">Curated data contract entries ready for review, edit and subscription.</p>
            </div>
          </div>

          <ul role="list" className="catalog-grid">
            {visibleCards.map((card) => (
              <CatalogCard key={card.slug} card={card} />
            ))}
          </ul>

          {cards.length === 0 ? <p className="catalog-empty">The contract repository is currently empty.</p> : null}

          {cards.length > 0 && visibleCards.length === 0 ? (
            <div className="catalog-empty">No contract matches the current filters.</div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
