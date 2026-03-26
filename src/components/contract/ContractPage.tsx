import { ContractBody } from "@/src/components/contract/ContractBody";
import { ContractHeader } from "@/src/components/contract/ContractHeader";
import { YamlDialogButton } from "@/src/components/contract/YamlDialogButton";
import { PageShell } from "@/src/components/layout/PageShell";
import type { DataContract } from "@/src/lib/types";

export function ContractPage({
  data,
  slug,
  yamlRaw
}: {
  data: DataContract;
  slug: string;
  yamlRaw: string;
}) {
  const asset = data.asset ?? {};
  const qualityChecks = data.quality?.checks?.length ?? 0;
  const fields = data.contract?.schema?.fields?.length ?? 0;
  const sources = data.inputs?.sources?.length ?? 0;

  return (
    <PageShell footerVersion="">
      <main className="contract-page">
        <div className="contract-page__inner">
          <div className="contract-layout-shell">
            <div className="contract-main-column">
              <ContractHeader asset={asset} showActions={false} />

              <section className="contract-summary-strip">
                <article className="contract-summary-strip__card">
                  <span className="contract-summary-strip__label">Schema fields</span>
                  <strong>{fields}</strong>
                </article>
                <article className="contract-summary-strip__card">
                  <span className="contract-summary-strip__label">Input sources</span>
                  <strong>{sources}</strong>
                </article>
                <article className="contract-summary-strip__card">
                  <span className="contract-summary-strip__label">Quality checks</span>
                  <strong>{qualityChecks}</strong>
                </article>
                <article className="contract-summary-strip__card">
                  <span className="contract-summary-strip__label">Lifecycle</span>
                  <strong>{asset.status ?? "Draft"}</strong>
                </article>
              </section>

              <div className="contract-content-shell">
                <div className="contract-content-shell__main">
                  <ContractBody data={data} />
                </div>
              </div>
            </div>

            <aside className="contract-side-panel">
              <div className="contract-side-card contract-side-card--actions">
                <h2>Workspace</h2>
                <p>Review, edit and follow this contract from one place.</p>
                <div className="contract-side-card__actions">
                  <a className="catalog-primary-link" href={`/editor?contract=${slug}`}>
                    Open editor
                  </a>
                  <button className="catalog-secondary-link catalog-secondary-link--button" type="button">
                    Subscribe
                  </button>
                  <YamlDialogButton yamlRaw={yamlRaw} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
