import Link from "next/link";

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

function TableCard({ refStr, side }: { refStr: string; side: "left" | "right" }) {
  const parts = splitRef(refStr);
  if (!parts) return <div className="text-sm text-gray-700">{refStr}</div>;

  const accent = side === "left" ? "#f97316" : "#3b82f6";
  const bgTint = side === "left" ? "rgba(249,115,22,0.06)" : "rgba(59,130,246,0.06)";

  return (
    <Link
      href={`/contracts/${parts.slug}`}
      className="block min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="h-1" style={{ background: accent }} />
      <div className="px-3 py-2" style={{ background: bgTint }}>
        <span className="text-xs font-mono font-semibold text-gray-900">{parts.slug}.{parts.field}</span>
      </div>
    </Link>
  );
}

function Connector({ sign, label }: { sign: string; label: string }) {
  const isManyLeft = sign === ">";
  const isManyRight = sign === "<";

  const leftMark = isManyLeft ? "M" : "1";
  const rightMark = isManyRight ? "M" : "1";
  const leftColor = isManyLeft ? "text-orange-600 bg-orange-50" : "text-blue-600 bg-blue-50";
  const rightColor = isManyRight ? "text-orange-600 bg-orange-50" : "text-blue-600 bg-blue-50";
  const lineColor = "#94a3b8";
  const arrowColor = isManyLeft ? "#f97316" : "#3b82f6";

  return (
    <div className="flex flex-col items-center shrink-0 mx-3" style={{ minWidth: 220 }}>
      <div className="relative flex items-center w-full" style={{ height: 40 }}>
        <svg className="absolute left-0 -translate-x-1/2" width="16" height="24" viewBox="0 0 16 24" style={{ color: arrowColor }}>
          {isManyLeft ? (
            <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="10" y1="12" x2="3" y2="5" />
              <line x1="10" y1="12" x2="3" y2="12" />
              <line x1="10" y1="12" x2="3" y2="19" />
            </g>
          ) : (
            <line x1="10" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          )}
        </svg>
        <div className="flex-1 h-0" style={{ borderTop: `2px solid ${lineColor}` }} />
        <span className="inline-flex items-center justify-center mx-2 rounded-md px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">
          {label}
        </span>
        <div className="flex-1 h-0" style={{ borderTop: `2px solid ${lineColor}` }} />
        <svg className="absolute right-0 translate-x-1/2" width="16" height="24" viewBox="0 0 16 24" style={{ color: arrowColor }}>
          {isManyRight ? (
            <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="12" x2="13" y2="5" />
              <line x1="6" y1="12" x2="13" y2="12" />
              <line x1="6" y1="12" x2="13" y2="19" />
            </g>
          ) : (
            <line x1="6" y1="4" x2="6" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          )}
        </svg>
      </div>
      <div className="flex items-center justify-between w-full mt-0.5 px-1">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold ${leftColor}`}>
          {leftMark}
        </span>
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold ${rightColor}`}>
          {rightMark}
        </span>
      </div>
    </div>
  );
}

export function RelationsSection({ relations }: { relations?: Array<{ ref_name: string; ref: string }> }) {
  if (!relations || relations.length === 0) return null;

  return (
    <section id="relations" className="mt-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-base font-semibold leading-6 text-gray-900">Relations</h1>
        <p className="text-sm text-gray-500">Relations avec d'autres contracts de données</p>
      </div>
      <div className="mt-2 overflow-hidden rounded-lg bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="space-y-6">
            {relations.map((rel, i) => {
              const parsed = parseCardinality(rel.ref);
              if (!parsed) {
                return <div key={i} className="text-sm text-gray-700">{rel.ref}</div>;
              }
              return (
                <div key={i} title={relationTooltip(parsed.left, parsed.sign, parsed.right)}>
                  <div className="flex items-start justify-center gap-0">
                    <div className="flex-1 max-w-[200px]">
                      <TableCard refStr={parsed.left} side="left" />
                    </div>
                    <Connector sign={parsed.sign} label={rel.ref_name} />
                    <div className="flex-1 max-w-[200px]">
                      <TableCard refStr={parsed.right} side="right" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
