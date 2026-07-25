import type { SourceDependency } from "@/src/lib/types";

type TransformationRecord = Record<string, unknown>;

function asLabel(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function resolveTransformationTitle(step: TransformationRecord, index: number) {
  return asLabel(step.step ?? step.name ?? step.id ?? step.type, `Step ${index + 1}`);
}

function resolveTransformationSummary(step: TransformationRecord) {
  return asLabel(step.description ?? step.expression ?? step.rule ?? step.operation, "Transformation step");
}

function resolveTransformationMeta(step: TransformationRecord) {
  const values = [step.type, step.engine, step.mode, step.tool]
    .map((value) => (typeof value === "string" && value.trim() ? value.trim() : null))
    .filter((value): value is string => Boolean(value));

  return values[0] ?? null;
}

export function InputsSection({
  outputName,
  sources,
  transformations
}: {
  outputName?: string;
  sources: SourceDependency[];
  transformations: TransformationRecord[];
}) {
  const pipelineSteps = transformations.map((step, index) => ({
    id: `step-${index}`,
    title: resolveTransformationTitle(step, index),
    summary: resolveTransformationSummary(step),
    meta: resolveTransformationMeta(step)
  }));

  if ((!sources || sources.length === 0) && pipelineSteps.length === 0) {
    return null;
  }

  return (
    <section id="inputs" className="contract-flow-section">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Flux de transformation</h1>
        <p className="text-sm text-gray-500">Sources, transformations et cible de sortie dans une vue unifiée.</p>
      </div>

      <div className="contract-flow">
        <div className="contract-flow__lane contract-flow__lane--sources">
          <div className="contract-flow__lane-head">
            <span className="contract-flow__eyebrow">Sources</span>
            <strong>{sources.length || 1}</strong>
          </div>

          <div className="contract-flow__stack">
            {sources.length > 0 ? (
              sources.map((source, index) => (
                <article className="contract-flow-card contract-flow-card--source" key={`${source.name ?? "source"}-${index}`}>
                  <div className="contract-flow-card__topline">
                    <span className="contract-flow-card__icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none">
                        <path
                          d="M4 6.5c0-1.38 2.69-2.5 6-2.5s6 1.12 6 2.5S13.31 9 10 9 4 7.88 4 6.5Zm0 3.5V6.5M16 10V6.5M4 10.5C4 11.88 6.69 13 10 13s6-1.12 6-2.5M4 14.5C4 15.88 6.69 17 10 17s6-1.12 6-2.5V10.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {source.type ? <span className="contract-flow-card__badge">{source.type}</span> : null}
                  </div>
                  <strong>{source.name ?? "Source"}</strong>
                  {source.description ? <p>{source.description}</p> : null}
                  <div className="contract-flow-card__meta">
                    {source.owner ? <span>{source.owner}</span> : null}
                    {source.ready_by ? <span>{source.ready_by}</span> : null}
                  </div>
                </article>
              ))
            ) : (
              <article className="contract-flow-card contract-flow-card--ghost">
                <strong>Input source</strong>
                <p>No explicit source declared in this contract.</p>
              </article>
            )}
          </div>
        </div>

        <div className="contract-flow__pipeline">
          <div className="contract-flow__pipeline-rail" aria-hidden="true" />

          <div className="contract-flow__lane-head">
            <span className="contract-flow__eyebrow">Transformations</span>
            <strong>{pipelineSteps.length || 1}</strong>
          </div>

          <div className="contract-flow__steps">
            {pipelineSteps.length > 0 ? (
              pipelineSteps.map((step, index) => (
                <article className="contract-flow-step" key={step.id}>
                  <div className="contract-flow-step__marker" aria-hidden="true">
                    <span>{index + 1}</span>
                  </div>
                  <div className="contract-flow-step__body">
                    <div className="contract-flow-step__heading">
                      <strong>{step.title}</strong>
                      {step.meta ? <span>{step.meta}</span> : null}
                    </div>
                    <p>{step.summary}</p>
                  </div>
                </article>
              ))
            ) : (
              <article className="contract-flow-step contract-flow-step--ghost">
                <div className="contract-flow-step__marker" aria-hidden="true">
                  <span>1</span>
                </div>
                <div className="contract-flow-step__body">
                  <div className="contract-flow-step__heading">
                    <strong>Transformation chain</strong>
                  </div>
                  <p>No explicit transformation steps declared in this contract.</p>
                </div>
              </article>
            )}
          </div>
        </div>

        <div className="contract-flow__lane contract-flow__lane--output">
          <div className="contract-flow__lane-head">
            <span className="contract-flow__eyebrow">Output</span>
            <strong>1</strong>
          </div>

          <article className="contract-flow-card contract-flow-card--output">
            <div className="contract-flow-card__topline">
              <span className="contract-flow-card__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6 4.75A1.75 1.75 0 0 1 7.75 3h4.5A1.75 1.75 0 0 1 14 4.75V7h1.25A1.75 1.75 0 0 1 17 8.75v5.5A1.75 1.75 0 0 1 15.25 16h-10.5A1.75 1.75 0 0 1 3 14.25v-5.5A1.75 1.75 0 0 1 4.75 7H6V4.75ZM7.5 7h5V4.75a.25.25 0 0 0-.25-.25h-4.5a.25.25 0 0 0-.25.25V7Zm2.5 2.25a.75.75 0 0 1 .75.75v1h1a.75.75 0 0 1 0 1.5h-1v1a.75.75 0 0 1-1.5 0v-1h-1a.75.75 0 0 1 0-1.5h1v-1a.75.75 0 0 1 .75-.75Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="contract-flow-card__badge contract-flow-card__badge--output">Serving</span>
            </div>
            <strong>{outputName?.trim() || "Published contract"}</strong>
            <p>Current output exposed by this contract after the transformation chain completes.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
