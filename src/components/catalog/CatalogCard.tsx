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
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <p
      className={`catalog-card__description cursor-pointer ${expanded ? "catalog-card__description--expanded" : "catalog-card__description--clamped"}`}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setExpanded((v) => !v); }}
      title={expanded ? "Click to collapse" : "Click to expand"}
    >
      {text}
    </p>
  );
}

export function CatalogCard({ card }: { card: CatalogCardType }) {
  if (!card.accessible) {
    return (
      <li className="catalog-card-listing group" data-accessible="false" data-search={card.searchData}>
        <div
          className="relative transition-shadow duration-200 group-hover:shadow-[0_0_20px_4px_rgba(234,88,12,0.35)] rounded-xl"
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
              </div>
              <span className="catalog-card__version">v{card.version}</span>
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

          <div data-ra-overlay className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-xl bg-orange-600/20 opacity-0 backdrop-blur-[0.5px] transition-opacity duration-200 group-hover:opacity-100" style={{ pointerEvents: "auto" }}>
            <div onClick={(e) => e.stopPropagation()}>
              <RequestAccessButton slug={card.slug} domain={card.domain} context={card.context} />
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
          </div>
          <span className="catalog-card__version">v{card.version}</span>
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

          <span className="catalog-card__link">Open</span>
        </div>
      </Link>
    </li>
  );
}
