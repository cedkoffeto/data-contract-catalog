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
    case ">": return `many ${lhs} to one ${rhs}`;
    case "<": return `one ${lhs} to many ${rhs}`;
    case "-": return `one ${lhs} to one ${rhs}`;
    default: return `${lhs} → ${rhs}`;
  }
}

function TableCard({ refStr, side, incoming }: { refStr: string; side: "left" | "right"; incoming?: boolean }) {
  const parts = splitRef(refStr);
  if (!parts) return <div className="text-sm text-gray-700">{refStr}</div>;

  const accent = incoming ? "#8b5cf6" : (side === "left" ? "#f97316" : "#3b82f6");

  return (
    <Link
      href={`/contracts/${parts.slug}`}
      className="group block min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm"
    >
      <div className="h-0.5" style={{ background: accent }} />
      <div className="px-2.5 py-1.5">
        <span className="text-xs font-mono font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{parts.slug}.{parts.field}</span>
      </div>
    </Link>
  );
}

function Connector({ sign, label, incoming }: { sign: string; label: string; incoming?: boolean }) {
  const isManyLeft = sign === ">";
  const isManyRight = sign === "<";

  const lineColor = "#cbd5e1";
  const strokeColor = incoming ? "#8b5cf6" : (isManyLeft ? "#f97316" : "#3b82f6");

  function crowFoot(side: "left" | "right") {
    const isMany = side === "left" ? isManyLeft : isManyRight;
    if (isMany) {
      // Crow's foot: 3 prongs
      const dir = side === "left" ? -1 : 1;
      return (
        <g fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round">
          <line x1={side === "left" ? 14 : 2} y1="10" x2={side === "left" ? 4 : 12} y2="3" />
          <line x1={side === "left" ? 14 : 2} y1="10" x2={side === "left" ? 4 : 12} y2="10" />
          <line x1={side === "left" ? 14 : 2} y1="10" x2={side === "left" ? 4 : 12} y2="17" />
        </g>
      );
    }
    // One: perpendicular bar
    const x = side === "left" ? 8 : 8;
    return (
      <g fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round">
        <line x1={x} y1="3" x2={x} y2="17" />
      </g>
    );
  }

  return (
    <div className="flex flex-col items-center shrink-0 mx-1" style={{ minWidth: 120 }}>
      <svg width="120" height="20" viewBox="0 0 120 20" className="shrink-0">
        <defs>
          <style>{`
            @keyframes dcc-flow-rel {
              0% { stroke-dashoffset: 24; }
              100% { stroke-dashoffset: 0; }
            }
          `}</style>
        </defs>
        {/* Left symbol */}
        {crowFoot("left")}
        {/* Line */}
        <line x1="14" y1="10" x2="106" y2="10" stroke={lineColor} strokeWidth="1.5" />
        <line x1="14" y1="10" x2="106" y2="10" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="4 8" opacity="0.6" style={{ animation: "dcc-flow-rel 0.8s linear infinite" }} />
        {/* Right symbol */}
        {crowFoot("right")}
        {/* Label in middle */}
        <rect x="38" y="2" width="44" height="16" rx="4" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5" />
        <text x="60" y="11" textAnchor="middle" dominantBaseline="central" fill="#475569" fontSize="9" fontWeight="600" fontFamily="system-ui">{label}</text>
      </svg>
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
  return (
    <div title={relationTooltip(parsed.left, parsed.sign, parsed.right)}>
      <div className="flex items-start justify-center gap-0">
        <div className="flex-1 min-w-0">
          <TableCard refStr={parsed.left} side="left" incoming={incoming} />
        </div>
        <Connector sign={parsed.sign} label={rel.ref_name} incoming={incoming} />
        <div className="flex-1 min-w-0">
          <TableCard refStr={parsed.right} side="right" incoming={incoming} />
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
  const hasDeclared = relations && relations.length > 0;
  const hasIncoming = incomingRelations && incomingRelations.length > 0;

  if (!hasDeclared && !hasIncoming) return null;

  return (
    <section id="relations" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">{t("sectionRelations")}</h1>
        <p className="text-sm text-gray-500">{t("sectionRelationsDesc")}</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          {hasDeclared && (
            <div className="space-y-4">
              {hasIncoming && (
                <h2 className="text-sm font-semibold text-gray-700">{t("sectionRelationsDeclared")}</h2>
              )}
              {(relations ?? []).filter(Boolean).map((rel, i) => (
                <RelationRow key={`decl-${i}`} rel={rel} />
              ))}
            </div>
          )}

          {hasIncoming && (
            <div className={hasDeclared ? "mt-6 space-y-4" : "space-y-4"}>
              <h2 className="text-sm font-semibold text-gray-700">
                {t("sectionRelationsIncoming")}
                <span className="ml-2 text-xs font-normal text-gray-400">{t("sectionRelationsIncomingDesc")}</span>
              </h2>
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
