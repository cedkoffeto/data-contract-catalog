import Link from "next/link";
import { useT } from "@/src/lib/use-i18n";

function parseCardinality(ref: string): { left: string; sign: string; right: string } | null {
  const m = ref.match(/^(.+?)\s*([><-])\s*(.+)$/);
  if (!m) return null;
  return { left: m[1].trim(), right: m[3].trim(), sign: m[2] };
}

function splitRef(refStr: string): { slug: string; field: string } | null {
  const m = refStr.match(/^@?([^.]+)\.(.+)$/);
  if (!m) return null;
  return { slug: m[1], field: m[2] };
}

function relationTooltip(left: string, sign: string, right: string): string {
  const l = splitRef(left);
  const r = splitRef(right);
  const lhs = l ? `${l.slug}.${l.field}` : left;
  const rhs = r ? `${r.slug}.${r.field}` : right;
  switch (sign) {
    case ">": return `many ${lhs} → one ${rhs}`;
    case "<": return `one ${lhs} → many ${rhs}`;
    case "-": return `one ${lhs} ↔ one ${rhs}`;
    default: return `${lhs} → ${rhs}`;
  }
}

function TableCard({ refStr, side }: { refStr: string; side: "left" | "right" }) {
  const parts = splitRef(refStr);
  if (!parts) return <div className="text-sm text-gray-700">{refStr}</div>;

  const isLeft = side === "left";
  const accent = isLeft ? "#f97316" : "#3b82f6";
  const bgTint = isLeft ? "rgba(249,115,22,0.04)" : "rgba(59,130,246,0.04)";
  const hoverBg = isLeft ? "rgba(249,115,22,0.08)" : "rgba(59,130,246,0.08)";

  return (
    <Link
      href={`/contracts/${parts.slug}`}
      className="group relative block min-w-0 flex-1 overflow-hidden rounded-lg border transition-all duration-150 hover:shadow-md"
      style={{ borderColor: `${accent}22` }}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ background: hoverBg }} />
      <div className="relative flex items-center gap-2.5 px-3.5 py-2.5" style={{ background: bgTint }}>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${accent}10` }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke={accent} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5M3.75 13.5h16.5M9 9v11.25M15 9v11.25" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-gray-400 truncate">{parts.slug}</div>
          <div className="text-xs font-semibold text-gray-900 font-mono truncate group-hover:text-orange-600 transition-colors">
            {parts.field}
          </div>
        </div>
        <svg className="h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}

function Connector({ sign, label, reverse }: { sign: string; label: string; reverse?: boolean }) {
  const isManyLeft = sign === ">";
  const isManyRight = sign === "<";
  const leftMark = isManyLeft ? "N" : "1";
  const rightMark = isManyRight ? "N" : "1";
  const accentLeft = isManyLeft ? "#f97316" : "#3b82f6";
  const accentRight = isManyRight ? "#f97316" : "#3b82f6";

  return (
    <div className="flex flex-col items-center shrink-0 mx-1" style={{ minWidth: 140 }}>
      {/* Crow's foot + animated track */}
      <div className="relative flex items-center w-full" style={{ height: 28 }}>
        {/* Left crow's foot */}
        <svg className="absolute left-0 -translate-x-[2px] z-10" width="14" height="28" viewBox="0 0 14 28">
          {isManyLeft ? (
            <g fill="none" stroke={accentLeft} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="14" x2="2" y2="4" />
              <line x1="10" y1="14" x2="2" y2="14" />
              <line x1="10" y1="14" x2="2" y2="24" />
            </g>
          ) : (
            <line x1="9" y1="5" x2="9" y2="23" stroke={accentRight} strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>

        {/* Animated track with circulating dots */}
        <div className={`relation-connector__track ml-1 mr-1 ${reverse ? "" : ""}`}>
          <span className={`relation-connector__dot ${reverse ? "relation-connector__dot--reverse" : ""}`} />
          <span className={`relation-connector__dot ${reverse ? "relation-connector__dot--reverse" : ""}`} />
          <span className={`relation-connector__dot ${reverse ? "relation-connector__dot--reverse" : ""}`} />
        </div>

        {/* Right crow's foot */}
        <svg className="absolute right-0 translate-x-[2px] z-10" width="14" height="28" viewBox="0 0 14 28">
          {isManyRight ? (
            <g fill="none" stroke={accentRight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="14" x2="12" y2="4" />
              <line x1="4" y1="14" x2="12" y2="14" />
              <line x1="4" y1="14" x2="12" y2="24" />
            </g>
          ) : (
            <line x1="5" y1="5" x2="5" y2="23" stroke={accentLeft} strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </div>

      {/* Badge + cardinality labels */}
      <div className="flex items-center justify-between w-full px-0.5 mt-1">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
          style={{ color: accentLeft, background: `${accentLeft}12` }}>
          {leftMark}
        </span>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 whitespace-nowrap">
          {label}
        </span>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
          style={{ color: accentRight, background: `${accentRight}12` }}>
          {rightMark}
        </span>
      </div>
    </div>
  );
}

function RelationRow({ rel, incoming }: { rel: { ref_name: string; ref: string }; incoming?: boolean }) {
  if (!rel) return null;
  const ref = rel.ref;
  if (!ref) {
    return <div className="text-sm text-gray-700">{rel.ref_name ?? "(no ref)"}</div>;
  }
  const parsed = parseCardinality(ref);
  if (!parsed) {
    return <div className="text-sm text-gray-700">{ref}</div>;
  }
  const leftRef = incoming ? parsed.right : parsed.left;
  const rightRef = incoming ? parsed.left : parsed.right;
  const leftSide = incoming ? "right" as const : "left" as const;
  const rightSide = incoming ? "left" as const : "right" as const;
  const connectorSign = incoming
    ? (parsed.sign === ">" ? "<" : parsed.sign === "<" ? ">" : parsed.sign)
    : parsed.sign;

  return (
    <div title={relationTooltip(parsed.left, parsed.sign, parsed.right)} className="group/row">
      <div className="flex items-center justify-center gap-0 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-3 transition-colors duration-150 hover:border-gray-200 hover:bg-gray-50">
        <div className="flex-1 min-w-0">
          <TableCard refStr={leftRef} side={leftSide} />
        </div>
        <Connector sign={connectorSign} label={rel.ref_name} reverse={incoming} />
        <div className="flex-1 min-w-0">
          <TableCard refStr={rightRef} side={rightSide} />
        </div>
      </div>
    </div>
  );
}

export function RelationsSection({
  relations,
  incomingRelations,
}: {
  relations?: Array<{ ref_name: string; ref: string }>;
  incomingRelations?: Array<{ ref_name: string; ref: string; declared_by_slug: string }>;
}) {
  const { t } = useT();
  const declaredCount = (relations ?? []).filter(Boolean).length;
  const incomingCount = (incomingRelations ?? []).filter(Boolean).length;
  const hasDeclared = declaredCount > 0;
  const hasIncoming = incomingCount > 0;

  if (!hasDeclared && !hasIncoming) return null;

  return (
    <section id="relations" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">{t("sectionRelations")}</h1>
        <p className="text-sm text-gray-500">{t("sectionRelationsDesc")}</p>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-1 rounded-full bg-orange-400" />
              <h2 className="text-xs font-semibold text-gray-700">{t("sectionRelationsDeclared")}</h2>
              <span className="inline-flex items-center justify-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
                {declaredCount}
              </span>
            </div>
            {hasDeclared ? (
              (relations ?? []).filter(Boolean).map((rel, i) => (
                <RelationRow key={`decl-${i}`} rel={rel} />
              ))
            ) : (
              <p className="text-xs text-gray-400 italic">{t("noRelationsDeclared")}</p>
            )}
          </div>

          {hasIncoming && (
            <div className="mt-6 space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-1 rounded-full bg-blue-400" />
                <h2 className="text-xs font-semibold text-gray-700">
                  {t("sectionRelationsIncoming")}
                  <span className="ml-2 text-[11px] font-normal text-gray-400">{t("sectionRelationsIncomingDesc")}</span>
                </h2>
                <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {incomingCount}
                </span>
              </div>
              {(incomingRelations ?? []).filter(Boolean).map((rel, i) => (
                <RelationRow key={`inc-${i}`} rel={rel} incoming />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
