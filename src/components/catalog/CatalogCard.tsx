import Link from "next/link";

import type { CatalogCard as CatalogCardType } from "@/src/lib/types";

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

export function CatalogCard({ card }: { card: CatalogCardType }) {
  return (
    <li className="catalog-card-listing" data-search={card.searchData}>
      <Link className="catalog-card" href={card.href}>
        <div className="catalog-card__header">
          <div className="catalog-card__meta">
            <span className="catalog-card__badge">{humanize(card.maturity)}</span>
            <span className="catalog-card__badge catalog-card__badge--subtle">{humanize(card.domain)}</span>
          </div>
          <span className="catalog-card__version">v{card.version}</span>
        </div>

        <div className="catalog-card__body">
          <h3 className="catalog-card__title">{card.title}</h3>

          {card.description ? <p className="catalog-card__description">{card.description}</p> : null}
        </div>

        <div className="catalog-card__footer">
          <div className="catalog-card__owner-block">
            <p className="catalog-card__owner">{card.owner || "Platform team"}</p>
            <span className="catalog-card__owner-label">Owner</span>
          </div>

          <span className="catalog-card__link">Open</span>
        </div>
      </Link>
    </li>
  );
}
