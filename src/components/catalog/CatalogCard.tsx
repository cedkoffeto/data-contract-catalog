"use client";

import { memo } from "react";
import Link from "next/link";

import { RequestAccessButton } from "@/src/components/catalog/RequestAccessButton";
import { RequestEditorUpgrade } from "@/src/components/contract/RequestEditorUpgrade";
import type { CatalogCard as CatalogCardType } from "@/src/lib/types";
import { useT } from "@/src/lib/use-i18n";

function humanize(value: string, t: ReturnType<typeof useT>["t"]): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return t("nonDefini");
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
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      className={`catalog-card__pin${pinned ? " pinned" : ""}`}
      title={pinned ? t("unpin") : t("pinToTop")}
      aria-label={pinned ? t("unpin") : t("pinToTop")}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={pinned ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <g transform="rotate(45 12 12)">
          <circle cx="12" cy="4" r="3" />
          <rect x="11" y="7" width="2" height="10" rx="1" />
          <path d="M7 17h10" />
        </g>
      </svg>
    </button>
  );
}

function FavoriteButton({ favorited, onToggle }: { favorited: boolean; onToggle: () => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      className={`catalog-card__fav${favorited ? " favorited" : ""}`}
      title={favorited ? t("removeFromFavorites") : t("addToFavorites")}
      aria-label={favorited ? t("removeFromFavorites") : t("addToFavorites")}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}

function SubscriptionButton({ subscribed, onToggle }: { subscribed: boolean; onToggle: () => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggle(); }}
      className={`catalog-card__sub${subscribed ? " subscribed" : ""}`}
      title={subscribed ? t("unsubscribe") : t("subscribeToUpdates")}
      aria-label={subscribed ? t("unsubscribe") : t("subscribeToUpdates")}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={subscribed ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </button>
  );
}

function CardActions({ card, isSubscribed, onTogglePin, onToggleFavorite, onToggleSubscription }: {
  card: CatalogCardType;
  isSubscribed?: boolean;
  onTogglePin?: (slug: string) => void;
  onToggleFavorite?: (slug: string) => void;
  onToggleSubscription?: (slug: string) => void;
}) {
  return (
    <div className="catalog-card__actions">
      <span className="catalog-card__version">v{card.version}</span>
      {card.isFavorite !== undefined ? (
        <FavoriteButton favorited={card.isFavorite} onToggle={() => onToggleFavorite?.(card.slug)} />
      ) : null}
      <SubscriptionButton subscribed={!!isSubscribed} onToggle={() => onToggleSubscription?.(card.slug)} />
      <PinButton pinned={!!card.isPinned} onToggle={() => onTogglePin?.(card.slug)} />
    </div>
  );
}

export const CatalogCard = memo(function CatalogCard({ card, onTogglePin, onToggleFavorite, onToggleSubscription, isSubscribed, canRequestUpgrade }: {
  card: CatalogCardType;
  onTogglePin?: (slug: string) => void;
  onToggleFavorite?: (slug: string) => void;
  onToggleSubscription?: (slug: string) => void;
  isSubscribed?: boolean;
  canRequestUpgrade?: boolean;
}) {
  const { t } = useT();
  if (!card.accessible) {
    return (
      <li
        className="catalog-card-listing"
        data-accessible="false"
      >
        <div className="relative rounded-xl card-overlay-wrapper">
          <div
            aria-disabled="true"
            className="catalog-card catalog-card--disabled"
            title={t("notAuthorized")}
          >
            <div className="catalog-card__header">
              <div className="catalog-card__meta">
                <span className="catalog-card__badge">{humanize(card.maturity, t)}</span>
                <span className="catalog-card__badge catalog-card__badge--subtle">{humanize(card.domain, t)}</span>
              </div>
              <CardActions card={card} isSubscribed={isSubscribed} onTogglePin={onTogglePin} onToggleFavorite={onToggleFavorite} onToggleSubscription={onToggleSubscription} />
            </div>
            <div className="catalog-card__body">
              <h3 className="catalog-card__title">{card.title}</h3>

              {card.description ? <Description text={card.description} /> : null}
            </div>

            <div className="catalog-card__footer">
              <div className="catalog-card__owner-block">
                <p className="catalog-card__owner">{card.owner || t("platformTeam")}</p>
                <span className="catalog-card__owner-label">{t("owner")}</span>
              </div>

              <span className="catalog-card__link catalog-card__link--disabled">
                <LockIcon /> {t("restrictedAccess")}
              </span>
            </div>
          </div>

          <div data-ra-overlay className="card-overlay">
            <div className="card-overlay__content">
              <RequestAccessButton slug={card.slug} domain={card.domain} context={card.context} accessRequestStatus={card.accessRequestStatus} />
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="catalog-card-listing" data-accessible="true">
      <Link className="catalog-card" href={card.href}>
        <div className="catalog-card__header">
          <div className="catalog-card__meta">
            <span className="catalog-card__badge">{humanize(card.maturity, t)}</span>
            <span className="catalog-card__badge catalog-card__badge--subtle">{humanize(card.domain, t)}</span>
          </div>
          <CardActions card={card} isSubscribed={isSubscribed} onTogglePin={onTogglePin} onToggleFavorite={onToggleFavorite} onToggleSubscription={onToggleSubscription} />
        </div>
        <div className="catalog-card__body">
          <h3 className="catalog-card__title">{card.title}</h3>

          {card.description ? <Description text={card.description} /> : null}
        </div>

        <div className="catalog-card__footer">
          <div className="catalog-card__owner-block">
            <p className="catalog-card__owner">{card.owner || t("platformTeam")}</p>
            <span className="catalog-card__owner-label">{t("owner")}</span>
          </div>
          {canRequestUpgrade !== false && !card.editable ? <RequestEditorUpgrade slug={card.slug} domain={card.domain} compact /> : null}
        </div>
      </Link>
    </li>
  );
});
