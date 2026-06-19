"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CatalogCard } from "@/src/components/catalog/CatalogCard";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import type { CatalogCard as CatalogCardType } from "@/src/lib/types";

const ALL_DOMAINS = "__all_domains__";
const ALL_CONTEXTS = "__all_contexts__";
const PAGE_SIZE = 20;

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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pinnedSlugs, setPinnedSlugs] = useState<Set<string>>(
    () => new Set(cards.filter((c) => c.isPinned).map((c) => c.slug)),
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

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

    return cards
      .filter((card) => {
        const matchesSearch = !query || card.searchData.includes(query);
        const matchesDomain = selectedDomain === ALL_DOMAINS || card.domain.trim() === selectedDomain;
        const matchesContext = selectedContext === ALL_CONTEXTS || card.context.trim() === selectedContext;
        const matchesMaturity = selectedMaturity === "all" || card.maturity.trim() === selectedMaturity;
        const matchesAccessible = !showOnlyAccessible || card.accessible;
        const matchesFavorite = !showFavoritesOnly || card.isFavorite;
        return matchesSearch && matchesDomain && matchesContext && matchesMaturity && matchesAccessible && matchesFavorite;
      })
      .sort((a, b) => {
        const aPinned = pinnedSlugs.has(a.slug) ? 1 : 0;
        const bPinned = pinnedSlugs.has(b.slug) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return a.title.localeCompare(b.title);
      });
  }, [cards, search, selectedDomain, selectedContext, selectedMaturity, showOnlyAccessible, showFavoritesOnly, pinnedSlugs]);

  const renderedCards = visibleCards.slice(0, visibleCount);
  const hasMore = renderedCards.length < visibleCards.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedDomain, selectedContext, selectedMaturity, showOnlyAccessible, showFavoritesOnly]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  async function handleTogglePin(slug: string) {
    const next = !pinnedSlugs.has(slug);
    setPinnedSlugs((prev) => {
      const nextSet = new Set(prev);
      if (next) nextSet.add(slug); else nextSet.delete(slug);
      return nextSet;
    });
    await fetch(`/api/contracts/${encodeURIComponent(slug)}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: next }),
    });
  }

  async function handleToggleFavorite(slug: string) {
    const card = cards.find((c) => c.slug === slug);
    if (!card) return;
    const next = !card.isFavorite;
    setCards((prev) => prev.map((c) => (c.slug === slug ? { ...c, isFavorite: next } : c)));
    await fetch(`/api/contracts/${encodeURIComponent(slug)}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
  }

  const accessibleCount = useMemo(() => cards.filter((c) => c.accessible).length, [cards]);
  const favoriteCount = useMemo(() => cards.filter((c) => c.isFavorite).length, [cards]);

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
            {favoriteCount > 0 ? (
              <Button
                className={showFavoritesOnly ? "is-active" : undefined}
                onClick={() => setShowFavoritesOnly((v) => !v)}
                variant="chip"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Favorites ({favoriteCount})
              </Button>
            ) : null}
            {domains.map((domain) => (
              <Button
                key={domain}
                className={selectedDomain === domain ? "is-active" : undefined}
                onClick={() => setSelectedDomain(selectedDomain === domain ? ALL_DOMAINS : domain)}
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
            {(search || selectedDomain !== ALL_DOMAINS || selectedContext !== ALL_CONTEXTS || selectedMaturity !== "all" || showOnlyAccessible || showFavoritesOnly) && (
              <Button
                onClick={() => {
                  setSearch("");
                  setSelectedDomain(ALL_DOMAINS);
                  setSelectedContext(ALL_CONTEXTS);
                  setSelectedMaturity("all");
                  setShowOnlyAccessible(false);
                  setShowFavoritesOnly(false);
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
                  onClick={() => setSelectedContext(selectedContext === context ? ALL_CONTEXTS : context)}
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
                  onClick={() => setSelectedMaturity(selectedMaturity === maturity ? "all" : maturity)}
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
            {renderedCards.map((card) => (
              <CatalogCard key={card.slug} card={card} onTogglePin={() => handleTogglePin(card.slug)} onToggleFavorite={() => handleToggleFavorite(card.slug)} />
            ))}
          </ul>

          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <svg className="h-6 w-6 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : null}

          {cards.length === 0 ? <p className="catalog-empty">The contract repository is currently empty.</p> : null}

          {cards.length > 0 && visibleCards.length === 0 ? (
            <div className="catalog-empty">No contract matches the current filters.</div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
