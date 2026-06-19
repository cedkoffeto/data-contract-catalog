"use client";

import { useState } from "react";
import Link from "next/link";

import { RequestAccessButton } from "@/src/components/catalog/RequestAccessButton";
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

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Description({ text }: { text: string }) {
  if (!text) return null;

  return (
    <p className="catalog-card__description catalog-card__description--clamped">
      {text}
    </p>
  );
}

function PinButton({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      className="catalog-card__pin"
      title={pinned ? "Unpin" : "Pin to top"}
      aria-label={pinned ? "Unpin" : "Pin to top"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a4 4 0 0 0-4 4c0 2 1 3.5 2 4.5V21a2 2 0 0 0 4 0v-9.5c1-1 2-2.5 2-4.5a4 4 0 0 0-4-4z" />
        <path d="M8 21h8" />
      </svg>
    </button>
  );
}

function FavoriteButton({ favorited, onToggle }: { favorited: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      className="catalog-card__fav"
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}

export function CatalogCard({ card, onTogglePin, onToggleFavorite }: { card: CatalogCardType; onTogglePin?: () => void; onToggleFavorite?: () => void }) {
  const [hovered, setHovered] = useState(false);

  if (!card.accessible) {
    return (
      <li
        className="catalog-card-listing"
        data-accessible="false"
        data-search={card.searchData}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={`relative rounded-xl transition-shadow duration-200 ${hovered ? "shadow-[0_0_20px_4px_rgba(234,88,12,0.35)]" : ""}`}
        >
          <div
            aria-disabled="true"
            className="catalog-card catalog-card--disabled"
            title="Vous n'êtes pas autorisé à consulter ce contrat de données."
          >
            <div className="catalog-card__header">
              <div className="catalog-card__meta">
                <span className="catalog-card__badge">{humanize(card.maturity)}</span>
                <span className="catalog-card__badge catalog-card__badge--subtle">{humanize(card.domain)}</span>
                {card.isFavorite !== undefined ? (
                  <FavoriteButton favorited={card.isFavorite} onToggle={() => onToggleFavorite?.()} />
                ) : null}
              </div>
              <span className="catalog-card__version">v{card.version}</span>
              <PinButton pinned={!!card.isPinned} onToggle={() => onTogglePin?.()} />
            </div>
            <div className="catalog-card__body">
              <h3 className="catalog-card__title">{card.title}</h3>

              {card.description ? <Description text={card.description} /> : null}
            </div>

            <div className="catalog-card__footer">
              <div className="catalog-card__owner-block">
                <p className="catalog-card__owner">{card.owner || "Platform team"}</p>
                <span className="catalog-card__owner-label">Owner</span>
              </div>

              <span className="catalog-card__link catalog-card__link--disabled">
                <LockIcon /> Accès restreint
              </span>
            </div>
          </div>

          <div data-ra-overlay className={`absolute inset-0 z-10 flex cursor-default items-center justify-center rounded-xl bg-orange-600/20 backdrop-blur-[0.5px] transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}>
            <div onClick={(e) => e.stopPropagation()}>
              <RequestAccessButton slug={card.slug} domain={card.domain} context={card.context} accessRequestStatus={card.accessRequestStatus} />
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="catalog-card-listing" data-accessible="true" data-search={card.searchData}>
      <Link className="catalog-card" href={card.href}>
        <div className="catalog-card__header">
          <div className="catalog-card__meta">
            <span className="catalog-card__badge">{humanize(card.maturity)}</span>
            <span className="catalog-card__badge catalog-card__badge--subtle">{humanize(card.domain)}</span>
            {card.isFavorite !== undefined ? (
              <FavoriteButton favorited={card.isFavorite} onToggle={() => onToggleFavorite?.()} />
            ) : null}
          </div>
          <span className="catalog-card__version">v{card.version}</span>
          <PinButton pinned={!!card.isPinned} onToggle={() => onTogglePin?.()} />
        </div>
        <div className="catalog-card__body">
          <h3 className="catalog-card__title">{card.title}</h3>

          {card.description ? <Description text={card.description} /> : null}
        </div>

        <div className="catalog-card__footer">
          <div className="catalog-card__owner-block">
            <p className="catalog-card__owner">{card.owner || "Platform team"}</p>
            <span className="catalog-card__owner-label">Owner</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
