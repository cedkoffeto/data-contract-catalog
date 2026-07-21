"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CatalogCard } from "@/src/components/catalog/CatalogCard";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { SearchableMultiSelect } from "@/src/components/ui/SearchableMultiSelect";
import { useToast } from "@/src/components/ui/ToastProvider";
import { useT } from "@/src/lib/use-i18n";
import { dictionaries } from "@/src/lib/i18n";
import type { CatalogCard as CatalogCardType } from "@/src/lib/types";

const ALL_DOMAINS = "__all_domains__";

const MULTI_FIELDS: { key: string; label: string; placeholder: keyof (typeof dictionaries)["en"] }[] = [
  { key: "domain", label: "domain", placeholder: "searchFieldDomain" },
  { key: "owner", label: "owner", placeholder: "searchFieldOwner" },
  { key: "context", label: "context", placeholder: "searchFieldContext" },
  { key: "maturity", label: "maturity", placeholder: "searchFieldMaturity" },
  { key: "assetType", label: "assetType", placeholder: "searchFieldAssetType" },
  { key: "contract", label: "contract", placeholder: "searchFieldContract" },
];

function matchesMultiFilter(card: CatalogCardType, field: string, values: string[]): boolean {
  if (field === "contract") {
    const slug = card.slug.toLowerCase();
    const title = card.title.toLowerCase();
    return values.some((v) => slug.includes(v.toLowerCase()) || title.includes(v.toLowerCase()));
  }
  const cardValue = (card[field as keyof CatalogCardType] as string)?.toLowerCase() ?? "";
  return values.some((v) => cardValue.includes(v.toLowerCase()));
}

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

export function CatalogClient({ cards: initialCards, canRequestUpgrade, gitError, initialSubscriptionSlugs }: { cards: CatalogCardType[]; canRequestUpgrade?: boolean; gitError?: boolean; initialSubscriptionSlugs?: Set<string> }) {
  const { t, tWith } = useT();
  const { showToast } = useToast();
  const [showGitError, setShowGitError] = useState(gitError ?? false);
  const [cards, setCards] = useState(initialCards);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const [searchMode, setSearchMode] = useState<"free" | "multi">("free");
  const [freeText, setFreeText] = useState("");
  const [multiFilters, setMultiFilters] = useState<Record<string, string[]>>({});
  const [appliedMultiFilters, setAppliedMultiFilters] = useState<Record<string, string[]>>({});
  const [debouncedFreeText, setDebouncedFreeText] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (gitError) {
      setShowGitError(true);
      const timer = setTimeout(() => setShowGitError(false), 15000);
      return () => clearTimeout(timer);
    }
  }, [gitError]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedFreeText(freeText);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [freeText]);
  const [selectedDomain, setSelectedDomain] = useState(ALL_DOMAINS);
  const [selectedContexts, setSelectedContexts] = useState<Set<string>>(new Set());
  const [selectedMaturities, setSelectedMaturities] = useState<Set<string>>(new Set());
  const [showOnlyAccessible, setShowOnlyAccessible] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [maturityFilter, setMaturityFilter] = useState("");
  const [contextFilter, setContextFilter] = useState("");

  const [subscribedSlugs, setSubscribedSlugs] = useState<Set<string>>(initialSubscriptionSlugs ?? new Set());
  const subscribedSlugsRef = useRef(subscribedSlugs);
  subscribedSlugsRef.current = subscribedSlugs;
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(name: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  useEffect(() => {
    function onSubscriptionChange(e: Event) {
      const { slug, subscribed } = (e as CustomEvent).detail;
      setSubscribedSlugs((prev) => {
        const next = new Set(prev);
        if (subscribed) next.add(slug); else next.delete(slug);
        return next;
      });
    }
    window.addEventListener("subscription-changed", onSubscriptionChange);
    return () => window.removeEventListener("subscription-changed", onSubscriptionChange);
  }, []);

  useEffect(() => {
    function onFavoriteChange(e: Event) {
      const { slug, isFavorite } = (e as CustomEvent).detail;
      setCards((prev) => prev.map((c) => (c.slug === slug ? { ...c, isFavorite } : c)));
    }
    window.addEventListener("favorite-changed", onFavoriteChange);
    return () => window.removeEventListener("favorite-changed", onFavoriteChange);
  }, []);

  const domains = useMemo(() => {
    const unique = new Set(cards.map((card) => card.domain.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const contexts = useMemo(() => {
    const unique = new Set(cards.map((card) => card.context.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const domainToContexts = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const card of cards) {
      const d = card.domain.trim();
      const c = card.context.trim();
      if (!d || !c) continue;
      if (!map.has(d)) map.set(d, new Set());
      map.get(d)?.add(c);
    }
    return map;
  }, [cards]);

  const maturities = useMemo(() => {
    const unique = new Set(cards.map((card) => card.maturity.trim()).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const [domainCounts, contextCounts, maturityCounts, contextCountsFiltered] = useMemo(() => {
    const ft = debouncedFreeText.trim().toLowerCase();
    const mfEntries = Object.entries(appliedMultiFilters);

    function matchMultiSkip(card: CatalogCardType, skipField: string | null): boolean {
      for (const [field, values] of mfEntries) {
        if (!values?.length || field === skipField) continue;
        if (!matchesMultiFilter(card, field, values)) return false;
      }
      return true;
    }

    const dc: Record<string, number> = {};
    const cc: Record<string, number> = {};
    const mc: Record<string, number> = {};
    const ccf: Record<string, number> = {};

    for (const card of cards) {
      if (ft && !card.searchData.includes(ft)) continue;
      if (showOnlyAccessible && !card.accessible) continue;
      if (showFavoritesOnly && !card.isFavorite) continue;

      if (matchMultiSkip(card, "domain")) {
        if (selectedContexts.size === 0 || selectedContexts.has(card.context.trim())) {
          if (selectedMaturities.size === 0 || selectedMaturities.has(card.maturity.trim())) {
            const d = card.domain.trim();
            if (d) dc[d] = (dc[d] ?? 0) + 1;
          }
        }
      }

      if (matchMultiSkip(card, "context")) {
        if (selectedDomain === ALL_DOMAINS || card.domain.trim() === selectedDomain) {
          if (selectedMaturities.size === 0 || selectedMaturities.has(card.maturity.trim())) {
            const c = card.context.trim();
            if (c) cc[c] = (cc[c] ?? 0) + 1;
          }
        }
      }

      if (matchMultiSkip(card, "maturity")) {
        if (selectedDomain === ALL_DOMAINS || card.domain.trim() === selectedDomain) {
          if (selectedContexts.size === 0 || selectedContexts.has(card.context.trim())) {
            const m = card.maturity.trim();
            if (m) mc[m] = (mc[m] ?? 0) + 1;
          }
        }
      }

      if (matchMultiSkip(card, null)) {
        if (selectedDomain === ALL_DOMAINS || card.domain.trim() === selectedDomain) {
          if (selectedMaturities.size === 0 || selectedMaturities.has(card.maturity.trim())) {
            const c2 = card.context.trim();
            if (c2) ccf[c2] = (ccf[c2] ?? 0) + 1;
          }
        }
      }
    }

    return [dc, cc, mc, ccf];
  }, [cards, debouncedFreeText, appliedMultiFilters, selectedDomain, selectedContexts, selectedMaturities, showOnlyAccessible, showFavoritesOnly]);

  const visibleCards = useMemo(() => {
    const ft = debouncedFreeText.trim().toLowerCase();
    const mf = appliedMultiFilters;

    return cards
      .filter((card) => {
        const matchesFieldFilter = Object.entries(mf).every(
          ([field, values]) => !values || values.length === 0 || matchesMultiFilter(card, field, values),
        );
        const matchesSearch = !ft || card.searchData.includes(ft);
        if (!matchesFieldFilter || !matchesSearch) return false;
        const matchesDomain = selectedDomain === ALL_DOMAINS || card.domain.trim() === selectedDomain;
        const matchesContext = selectedContexts.size === 0 || selectedContexts.has(card.context.trim());
        const matchesMaturity = selectedMaturities.size === 0 || selectedMaturities.has(card.maturity.trim());
        const matchesAccessible = !showOnlyAccessible || card.accessible;
        const matchesFavorite = !showFavoritesOnly || card.isFavorite;
        return matchesDomain && matchesContext && matchesMaturity && matchesAccessible && matchesFavorite;
      })
      .sort((a, b) => {
        const aPinned = a.isPinned ? 0 : 1;
        const bPinned = b.isPinned ? 0 : 1;
        if (aPinned !== bPinned) return aPinned - bPinned;
        const aFav = a.isFavorite ? 0 : 1;
        const bFav = b.isFavorite ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return a.title.localeCompare(b.title);
      });
  }, [cards, debouncedFreeText, appliedMultiFilters, selectedDomain, selectedContexts, selectedMaturities, showOnlyAccessible, showFavoritesOnly]);

  const handleTogglePin = useCallback(async (slug: string) => {
    const card = cardsRef.current.find((c) => c.slug === slug);
    if (!card) return;
    const next = !card.isPinned;
    const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: next }),
    });
    if (!res.ok) { showToast("Erreur lors de l'épinglage", "error"); return; }
    setCards((prev) => prev.map((c) => (c.slug === slug ? { ...c, isPinned: next } : c)));
    showToast(next ? "Contrat épinglé" : "Contrat désépinglé");
  }, [showToast]);

  const handleToggleFavorite = useCallback(async (slug: string) => {
    const card = cardsRef.current.find((c) => c.slug === slug);
    if (!card) return;
    const next = !card.isFavorite;
    const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
    if (!res.ok) { showToast("Erreur lors de la mise en favori", "error"); return; }
    setCards((prev) => prev.map((c) => (c.slug === slug ? { ...c, isFavorite: next } : c)));
    window.dispatchEvent(new CustomEvent("favorite-changed", { detail: { slug, isFavorite: next } }));
    showToast(next ? "Ajouté aux favoris" : "Retiré des favoris");
  }, [showToast]);

  const handleToggleSubscription = useCallback(async (slug: string) => {
    const currentlySubscribed = subscribedSlugsRef.current.has(slug);
    const res = await fetch(`/api/contracts/${encodeURIComponent(slug)}/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentlySubscribed ? { channel: null } : {}),
    });
    if (!res.ok) {       showToast(t("subscriptionError"), "error"); return; }
    setSubscribedSlugs((prev) => {
      const next = new Set(prev);
      if (currentlySubscribed) next.delete(slug); else next.add(slug);
      return next;
    });
    window.dispatchEvent(new CustomEvent("subscription-changed", { detail: { slug, subscribed: !currentlySubscribed } }));
    showToast(currentlySubscribed ? t("subscriptionRemoved") : t("subscriptionActivated"));
  }, [showToast]);

  const accessibleCount = useMemo(() => cards.filter((c) => c.accessible).length, [cards]);
  const favoriteCount = useMemo(() => cards.filter((c) => c.isFavorite).length, [cards]);

  const stats = useMemo(
    () => [
      { label: t("contracts"), value: cards.length.toString().padStart(2, "0") },
      { label: t("domains"), value: domains.length.toString().padStart(2, "0") },
      { label: t("contexts"), value: contexts.length.toString().padStart(2, "0") },
      { label: t("maturityTiers"), value: maturities.length.toString().padStart(2, "0") }
    ],
    [cards.length, domains.length, contexts.length, maturities.length]
  );

  const multiOptions = useMemo(() => {
    const opts: Record<string, { value: string; label: string; sublabel?: string }[]> = {};
    for (const field of MULTI_FIELDS) {
      if (field.key === "contract") {
        const seen = new Map<string, { value: string; label: string; sublabel: string }>();
        for (const card of cards) {
          const slug = card.slug.trim();
          if (!slug || seen.has(slug)) continue;
          seen.set(slug, { value: slug, label: slug, sublabel: card.title.trim() });
        }
        opts[field.key] = Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
      } else {
        const unique = new Set(cards.map((card) => (card[field.key as keyof CatalogCardType] as string)?.trim()).filter(Boolean));
        opts[field.key] = Array.from(unique)
          .sort((a, b) => a.localeCompare(b))
          .map((v) => ({ value: v, label: v }));
      }
    }
    return opts;
  }, [cards]);

  const hasActiveMultiFilters = Object.values(multiFilters).some((arr) => arr.length > 0);

  function handleApplyMultiSearch() {
    setAppliedMultiFilters({ ...multiFilters });
  }

  function handleResetMultiSearch() {
    setMultiFilters({});
    setAppliedMultiFilters({});
  }

  return (
    <div className="catalog-shell">
      {showGitError ? (
        <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 shadow-sm">
          Impossible de récupérer les contrats depuis GitLab. Les contrats locaux sont affichés à la place.
        </div>
      ) : null}
      <section className="catalog-header">
        <div>
          <h1 className="catalog-header__title">{t("catalogTitle")}</h1>
          <p className="catalog-header__meta">
            {stats.map((stat) => `${stat.value} ${stat.label.toLowerCase()}`).join("  •  ")}
          </p>
        </div>
        <a className="catalog-primary-link" href="/editor">
          {t("newContract")}
        </a>
      </section>

      <section className="catalog-searchbar">
        <div className="catalog-searchbar__top-row">
          <div className="editor-tabs" role="tablist" aria-label="Search mode">
            <button
              type="button"
              className={`editor-tabs__item${searchMode === "free" ? " is-active" : ""}`}
              onClick={() => setSearchMode("free")}
            >
              {t("searchFree")}
            </button>
            <button
              type="button"
              className={`editor-tabs__item${searchMode === "multi" ? " is-active" : ""}`}
              onClick={() => setSearchMode("multi")}
            >
              {t("searchMulti")}
            </button>
          </div>
          {searchMode === "multi" && hasActiveMultiFilters && (
            <Button variant="outline" onClick={handleResetMultiSearch}>
              {t("reset")}
            </Button>
          )}
        </div>

        {searchMode === "free" ? (
          <div className="catalog-searchbar__wrapper">
            <Input
              id="search"
              name="q"
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              placeholder={t("searchPlaceholder")}
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
          </div>
        ) : (
          <>
            <div className="catalog-searchbar__multi">
              {MULTI_FIELDS.map((field) => (
                <SearchableMultiSelect
                  key={field.key}
                  value={multiFilters[field.key] ?? []}
                  onChange={(values) => setMultiFilters((prev) => ({ ...prev, [field.key]: values }))}
                  options={multiOptions[field.key] ?? []}
                  placeholder={t(field.placeholder)}
                />
              ))}
              <Button
                onClick={handleApplyMultiSearch}
                disabled={!hasActiveMultiFilters}
                className="catalog-searchbar__search-btn"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </>
        )}

        <div className="catalog-domain-row">
          <div className="catalog-domain-row__title">
            <span>{t("domains")}</span>
            <span>{tWith("contractsCount", { n: String(visibleCards.length) })}</span>
          </div>

          <div className="catalog-domain-row__list">
            <Button
              className={selectedDomain === ALL_DOMAINS ? "is-active" : undefined}
              onClick={() => setSelectedDomain(ALL_DOMAINS)}
              variant="chip"
            >
              {t("allDomains")}
              <span className="catalog-filter-badge">{domains.length}</span>
            </Button>
            {cards.length > 0 ? (
              <Button
                className={showOnlyAccessible ? "is-active" : undefined}
                onClick={() => setShowOnlyAccessible((v) => !v)}
                variant="chip"
              >
                {tWith("accessibleOnly", { accessible: String(accessibleCount), total: String(cards.length) })}
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
                {tWith("favorites", { count: String(favoriteCount) })}
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
                <span className="catalog-filter-badge">{domainCounts[domain]}</span>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="catalog-layout">
        <aside className="catalog-filters">
          <div className="catalog-filters__heading">
            <h2>{t("filters")}</h2>
            {(freeText || Object.values(multiFilters).some((arr) => arr.length > 0) || selectedDomain !== ALL_DOMAINS || selectedContexts.size > 0 || selectedMaturities.size > 0 || showOnlyAccessible || showFavoritesOnly) && (
              <Button
                onClick={() => {
                  setFreeText("");
                  setMultiFilters({});
                  setAppliedMultiFilters({});
                  setSelectedDomain(ALL_DOMAINS);
                  setSelectedContexts(new Set());
                  setSelectedMaturities(new Set());
                  setShowOnlyAccessible(false);
                  setShowFavoritesOnly(false);
                }}
                variant="outline"
              >
                {t("reset")}
              </Button>
            )}
          </div>

          <div className="catalog-filter-group">
            <button type="button" className="catalog-filter-group__header" onClick={() => toggleGroup("maturity")}>
              <span className="catalog-filter-group__label">{t("maturity")}</span>
              <svg className={`catalog-filter-group__chevron${collapsedGroups.has("maturity") ? " collapsed" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="catalog-filter-stack" style={{ maxHeight: collapsedGroups.has("maturity") ? "0" : undefined, opacity: collapsedGroups.has("maturity") ? 0 : 1 }}>
              {maturities.length > 10 && (
                <div className="catalog-filter-search">
                  <svg className="catalog-filter-search__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    className="catalog-filter-search__input"
                    placeholder="Filter maturities..."
                    value={maturityFilter}
                    onChange={(e) => setMaturityFilter(e.target.value)}
                  />
                </div>
              )}
              <button
                className={selectedMaturities.size === 0 ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                onClick={() => setSelectedMaturities(new Set())}
                type="button"
              >
                {t("allMaturities")}
              </button>
              {maturities.filter((m) => !maturityFilter || humanize(m).toLowerCase().includes(maturityFilter.toLowerCase())).map((maturity) => (
                <button
                  key={maturity}
                  className={selectedMaturities.has(maturity) ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                  onClick={() => setSelectedMaturities((prev) => {
                    const next = new Set(prev);
                    if (next.has(maturity)) next.delete(maturity); else next.add(maturity);
                    return next;
                  })}
                  type="button"
                >
                  <span>{humanize(maturity)}</span>
                  <span className="catalog-filter-badge">{maturityCounts[maturity]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-filter-group">
            <button type="button" className="catalog-filter-group__header" onClick={() => toggleGroup("context")}>
              <span className="catalog-filter-group__label">{t("context")}</span>
              <svg className={`catalog-filter-group__chevron${collapsedGroups.has("context") ? " collapsed" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="catalog-filter-stack" style={{ maxHeight: collapsedGroups.has("context") ? "0" : undefined, opacity: collapsedGroups.has("context") ? 0 : 1 }}>
              <div className="catalog-filter-search">
                <svg className="catalog-filter-search__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  className="catalog-filter-search__input"
                  placeholder="Filter contexts..."
                  value={contextFilter}
                  onChange={(e) => setContextFilter(e.target.value)}
                />
              </div>
              <button
                className={selectedContexts.size === 0 ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                onClick={() => setSelectedContexts(new Set())}
                type="button"
              >
                {t("allContexts")}
              </button>
              {(() => {
                const filtered = contexts.filter((c) => !contextFilter || humanize(c).toLowerCase().includes(contextFilter.toLowerCase()));
                if (selectedDomain === ALL_DOMAINS) {
                  return filtered.map((context) => (
                    <button
                      key={context}
                      className={selectedContexts.has(context) ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                      onClick={() => setSelectedContexts((prev) => {
                        const next = new Set(prev);
                        if (next.has(context)) next.delete(context); else next.add(context);
                        return next;
                      })}
                      type="button"
                    >
                      <span>{humanize(context)}</span>
                      <span className="catalog-filter-badge">{contextCounts[context]}</span>
                    </button>
                  ));
                }
                const domainContexts = domainToContexts.get(selectedDomain) ?? new Set();
                const relevant = filtered.filter((c) => domainContexts.has(c));
                const other = filtered.filter((c) => !domainContexts.has(c));
                return (
                  <>
                    {relevant.map((context) => (
                      <button
                        key={context}
                        className={selectedContexts.has(context) ? "catalog-filter-pill is-active" : "catalog-filter-pill"}
                        onClick={() => setSelectedContexts((prev) => {
                          const next = new Set(prev);
                          if (next.has(context)) next.delete(context); else next.add(context);
                          return next;
                        })}
                        type="button"
                      >
                        <span>{humanize(context)}</span>
                        <span className="catalog-filter-badge">{contextCounts[context]}</span>
                      </button>
                    ))}
                    {other.length > 0 && relevant.length > 0 && (
                      <div className="mt-2 border-t border-gray-200 pt-2" />
                    )}
                    {other.map((context) => (
                      <button
                        key={context}
                        className="catalog-filter-pill catalog-filter-pill--muted"
                        disabled
                        type="button"
                      >
                        <span>{humanize(context)}</span>
                        <span className="catalog-filter-badge">{contextCounts[context]}</span>
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="catalog-filter-group">
            <button type="button" className="catalog-filter-group__header" onClick={() => toggleGroup("overview")}>
              <span className="catalog-filter-group__label">{t("overview")}</span>
              <svg className={`catalog-filter-group__chevron${collapsedGroups.has("overview") ? " collapsed" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="catalog-filter-stack" style={{ maxHeight: collapsedGroups.has("overview") ? "0" : undefined, opacity: collapsedGroups.has("overview") ? 0 : 1 }}>
              <div className="catalog-filter-summary">
                {stats.map((stat) => (
                  <div key={stat.label} className="catalog-filter-summary__item">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="catalog-results" id="catalog-grid">
          <div className="catalog-results__header">
            <div>
              <h2>{t("contracts")}</h2>
              <p className="catalog-results__meta">{t("catalogDescription")}</p>
            </div>
          </div>

          <ul role="list" className="catalog-grid">
            {visibleCards.map((card) => (
              <CatalogCard key={card.slug} card={card} canRequestUpgrade={canRequestUpgrade} onTogglePin={handleTogglePin} onToggleFavorite={handleToggleFavorite} onToggleSubscription={handleToggleSubscription} isSubscribed={subscribedSlugs.has(card.slug)} />
            ))}
          </ul>

          {cards.length === 0 ? <p className="catalog-empty">{t("emptyCatalog")}</p> : null}

          {cards.length > 0 && visibleCards.length === 0 ? (
            <div className="catalog-empty">{t("emptyFilters")}</div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
