"use client";

import { useT } from "@/src/lib/use-i18n";
import type { Asset } from "@/src/lib/types";

function getReadableValue(value?: string) {
  return value && value.trim() ? value : "Not set";
}

export function ContractHeader({
  asset,
  showActions: _showActions = true
}: {
  asset: Asset;
  showActions?: boolean;
}) {
  const { t } = useT();
  const tags = asset.tags ?? [];
  const owner =
    asset.owners?.business_owner?.name ??
    asset.owners?.technical_owner?.name ??
    asset.owners?.business_owner?.email ??
    asset.owners?.technical_owner?.email ??
    t("platformTeam");

  return (
    <section className="contract-hero">
      <div className="contract-hero__copy">
        <h1 className="contract-hero__title">{asset.name ?? "Unknown contract"}</h1>
        {asset.description ? <p className="contract-hero__description">{asset.description}</p> : null}

        <dl className="contract-hero__facts">
          <div>
            <dt>{t("version")}</dt>
            <dd>{getReadableValue(asset.version)}</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>{getReadableValue(asset.domain)}</dd>
          </div>
          <div>
            <dt>{t("maturity")}</dt>
            <dd>{getReadableValue(asset.maturity)}</dd>
          </div>
          <div>
            <dt>{t("owner")}</dt>
            <dd>{owner}</dd>
          </div>
        </dl>

        {tags.length > 0 ? (
          <div className="contract-hero__facts">
            <dt>{t("tags")}</dt>
            <dd>
              <div className="contract-hero__tags" style={{ marginTop: 0 }}>
                {tags.map((tag) => (
                  <span key={tag} className="contract-hero__tag">
                    {tag}
                  </span>
                ))}
              </div>
            </dd>
          </div>
        ) : null}
      </div>
    </section>
  );
}
