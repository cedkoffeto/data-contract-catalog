"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CatalogCard } from "@/src/components/catalog/CatalogCard";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { Input } from "@/src/components/ui/Input";
import { Popover } from "@/src/components/ui/Popover";
import { cn } from "@/src/lib/format";
import type { CatalogCard as CatalogCardType } from "@/src/lib/types";

const ALL_DOMAINS = "__all_domains__";

function humanize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Non défini";
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
  const [selectedMaturities, setSelectedMaturities] = useState<string[]>([]);
  const [isMaturityDropdownOpen, setIsMaturityDropdownOpen] = useState(false);
  const [canScrollDomainsLeft, setCanScrollDomainsLeft] = useState(false);
  const [canScrollDomainsRight, setCanScrollDomainsRight] = useState(false);
  const domainScrollerRef = useRef<HTMLDivElement>(null);

  const domains = useMemo(() => {
    const unique = new Set(cards.map((card) => card.domain.trim()).filter(Boolean));
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
      const matchesMaturity =
        selectedMaturities.length === 0 || selectedMaturities.includes(card.maturity.trim());
      return matchesSearch && matchesDomain && matchesMaturity;
    });
  }, [cards, search, selectedDomain, selectedMaturities]);

  useEffect(() => {
    function updateDomainScrollState() {
      const element = domainScrollerRef.current;
      if (!element) {
        setCanScrollDomainsLeft(false);
        setCanScrollDomainsRight(false);
        return;
      }

      const hasOverflow = element.scrollWidth > element.clientWidth + 4;
      setCanScrollDomainsLeft(hasOverflow && element.scrollLeft > 4);
      setCanScrollDomainsRight(hasOverflow && element.scrollLeft + element.clientWidth < element.scrollWidth - 4);
    }

    updateDomainScrollState();
    const element = domainScrollerRef.current;
    element?.addEventListener("scroll", updateDomainScrollState, { passive: true });
    window.addEventListener("resize", updateDomainScrollState);

    return () => {
      element?.removeEventListener("scroll", updateDomainScrollState);
      window.removeEventListener("resize", updateDomainScrollState);
    };
  }, [domains]);

  function toggleMaturity(maturity: string) {
    setSelectedMaturities((previous) => {
      if (previous.includes(maturity)) {
        return previous.filter((item) => item !== maturity);
      }
      return [...previous, maturity];
    });
  }

  function resetFilters() {
    setSearch("");
    setSelectedDomain(ALL_DOMAINS);
    setSelectedMaturities([]);
  }

  function scrollDomains(direction: "left" | "right") {
    const element = domainScrollerRef.current;
    if (!element) {
      return;
    }

    const amount = Math.max(180, element.clientWidth * 0.45);
    element.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth"
    });
  }

  return (
    <section id="catalog">
      {cards.length > 0 ? (
        <form aria-labelledby="filter-heading" className="pb-6" onSubmit={(event) => event.preventDefault()}>
          <h2 id="filter-heading" className="sr-only">
            Filters
          </h2>

          <div className="ui-filter-shell">
            <div className="ui-filter-toolbar">
              <div className="ui-filter-toolbar-search">
                <Input
                  id="search"
                  name="q"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un contrat, un domaine, une version..."
                  wrapperClassName="w-full"
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

              {maturities.length > 0 ? (
                <Popover
                  open={isMaturityDropdownOpen}
                  onOpenChange={setIsMaturityDropdownOpen}
                  trigger={({ open, toggle }) => (
                    <Button aria-expanded={open} className="justify-between" onClick={toggle} style={{ minWidth: "12rem" }}>
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M3 5.75A.75.75 0 013.75 5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75Zm2.5 4A.75.75 0 016.25 9h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75Zm2.5 4a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75Z" />
                        </svg>
                        <span>Maturité</span>
                        {selectedMaturities.length > 0 ? <Badge>{selectedMaturities.length}</Badge> : null}
                      </span>
                      <svg
                        className={cn("h-4 w-4 text-gray-500 transition-transform", open ? "rotate-180" : undefined)}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Button>
                  )}
                >
                  <div className="ui-popover-header">
                    <div>
                      <p className="ui-popover-title">Filtrer par maturité</p>
                      <p className="ui-popover-subtitle">Sélection multiple possible</p>
                    </div>
                    <Button className="text-xs" variant="ghost" onClick={() => setSelectedMaturities([])}>
                      Réinitialiser
                    </Button>
                  </div>

                  <fieldset className="ui-checkbox-list">
                    {maturities.map((maturity) => (
                      <Checkbox
                        key={maturity}
                        checked={selectedMaturities.includes(maturity)}
                        onChange={() => toggleMaturity(maturity)}
                      >
                        {humanize(maturity)}
                      </Checkbox>
                    ))}
                  </fieldset>
                </Popover>
              ) : null}
            </div>

            <div className="ui-filter-meta">
              <span>{visibleCards.length} résultat(s)</span>
              {selectedDomain !== ALL_DOMAINS ? <span>Domaine: {humanize(selectedDomain)}</span> : null}
              {selectedMaturities.length > 0 ? (
                <span>Maturité: {selectedMaturities.map(humanize).join(", ")}</span>
              ) : null}
              {(search || selectedDomain !== ALL_DOMAINS || selectedMaturities.length > 0) && (
                <Button variant="ghost" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </div>

            {domains.length > 0 ? (
              <div className="ui-domain-block">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Domaines</p>
                <div className="ui-domain-slider">
                  <Button
                    aria-label="Faire défiler les domaines vers la gauche"
                    className={cn(
                      "ui-domain-arrow",
                      !canScrollDomainsLeft ? "ui-domain-arrow--hidden" : undefined
                    )}
                    onClick={() => scrollDomains("left")}
                    variant="outline"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M11.79 15.77a.75.75 0 01-1.06.02l-5.25-5a.75.75 0 010-1.08l5.25-5a.75.75 0 111.04 1.08L7.07 10l4.72 4.69a.75.75 0 01.02 1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                  <div className="ui-domain-scroll" ref={domainScrollerRef}>
                    <div className="ui-domain-row">
                      <Button
                        className={cn(
                          "ui-domain-segment ui-domain-segment--first",
                          selectedDomain === ALL_DOMAINS ? "is-active" : undefined
                        )}
                        onClick={() => setSelectedDomain(ALL_DOMAINS)}
                        variant="chip"
                      >
                        Tous
                      </Button>
                      {domains.map((domain, index) => (
                        <Button
                          key={domain}
                          className={cn(
                            "ui-domain-segment",
                            index === domains.length - 1 ? "ui-domain-segment--last" : "ui-domain-segment--middle",
                            selectedDomain === domain ? "is-active" : undefined
                          )}
                          onClick={() => setSelectedDomain(domain)}
                          variant="chip"
                        >
                          {humanize(domain)}
                        </Button>
                      ))}
                       {domains.map((domain, index) => (
                        <Button
                          key={domain}
                          className={cn(
                            "ui-domain-segment",
                            index === domains.length - 1 ? "ui-domain-segment--last" : "ui-domain-segment--middle",
                            selectedDomain === domain ? "is-active" : undefined
                          )}
                          onClick={() => setSelectedDomain(domain)}
                          variant="chip"
                        >
                          {humanize(domain)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    aria-label="Faire défiler les domaines vers la droite"
                    className={cn(
                      "ui-domain-arrow",
                      !canScrollDomainsRight ? "ui-domain-arrow--hidden" : undefined
                    )}
                    onClick={() => scrollDomains("right")}
                    variant="outline"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M8.21 4.23a.75.75 0 011.06-.02l5.25 5a.75.75 0 010 1.08l-5.25 5a.75.75 0 11-1.04-1.08L12.93 10 8.23 5.31a.75.75 0 01-.02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </form>
      ) : null}

      <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <CatalogCard key={card.slug} card={card} />
        ))}
      </ul>

      {cards.length === 0 ? <p>Le catalogue des Data Contrats est vide.</p> : null}

      {cards.length > 0 && visibleCards.length === 0 ? (
        <div id="no-results" className="text-sm text-gray-500">
          Aucun résultat trouvé.
        </div>
      ) : null}
    </section>
  );
}
