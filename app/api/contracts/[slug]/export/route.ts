export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { apiError } from "@/src/lib/api-error";

import { getContractBySlug } from "@/src/lib/contracts";
import { authorize } from "@/src/lib/access-control";
import type { Session } from "next-auth";

import { requireApiAuth, getGlobalPermissions } from "@/src/lib/require-auth";
import { withErrorHandling } from "@/src/lib/with-error-handling";
import type { DataContract } from "@/src/lib/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type ExportField = {
  name?: string;
  type?: string;
  description?: string;
  required?: boolean;
  pii_classification?: string;
  business_rules?: string[];
  example?: unknown;
  fields?: ExportField[];
};

function flattenFields(fields: ExportField[], prefix = ""): Array<Record<string, string>> {
  return fields.flatMap((field) => {
    const name = `${prefix}${field.name ?? ""}`;
    const row = {
      field: name,
      type: field.type ?? "",
      description: field.description ?? "",
      required: field.required ? "yes" : "no",
      pii: field.pii_classification ?? "",
      rules: Array.isArray(field.business_rules) ? field.business_rules.join("; ") : "",
      example: field.example === undefined || field.example === null ? "" : JSON.stringify(field.example),
    };
    const children = Array.isArray(field.fields) ? flattenFields(field.fields, `${name}.`) : [];
    return [row, ...children];
  });
}

function toCsv(rows: Array<Record<string, string>>) {
  const headers = ["field", "type", "description", "required", "pii", "rules", "example"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(","))].join("\n");
}

function toPrintHtml(contract: { slug: string; yamlRaw: string; data: DataContract }) {
  const asset = contract.data.asset ?? {};
  const fields = flattenFields(contract.data.contract?.schema?.fields ?? []);
  const rows = fields.map((field) => `<tr><td>${escapeHtml(field.field)}</td><td>${escapeHtml(field.type)}</td><td>${escapeHtml(field.description)}</td></tr>`).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(asset.name ?? contract.slug)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
    h1 { color: #f97316; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
    .meta div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .meta dt { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .meta dd { margin: 4px 0 0; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    pre { white-space: pre-wrap; background: #f9fafb; padding: 16px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(asset.name ?? contract.slug)}</h1>
  <p>${escapeHtml(asset.description ?? "")}</p>
  <dl class="meta">
    <div><dt>Slug</dt><dd>${escapeHtml(contract.slug)}</dd></div>
    <div><dt>Version</dt><dd>${escapeHtml(asset.version ?? "")}</dd></div>
    <div><dt>Domain</dt><dd>${escapeHtml(asset.domain ?? "")}</dd></div>
    <div><dt>Maturity</dt><dd>${escapeHtml(asset.maturity ?? "")}</dd></div>
  </dl>
  <h2>Fields</h2>
  <table>
    <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
    <tbody>${rows || "<tr><td colspan=\"3\">No fields</td></tr>"}</tbody>
  </table>
  <h2>YAML</h2>
  <pre>${contract.yamlRaw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
}

async function ensureCanRead(slug: string, session: Session) {
  const contract = await getContractBySlug(slug);
  if (!contract) return null;

  const userId = session?.user?.name ?? "";
  const permissions = await getGlobalPermissions(session);
  if (permissions.includes("admin")) return contract;

  const allowed = await authorize(userId, contract.data.asset?.domain ?? "", contract.data.asset?.context ?? "", "read", slug);
  return allowed ? contract : null;
}

async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await requireApiAuth();
  if (session instanceof Response) return session;
  const userId = session?.user?.name;
  if (!userId) return apiError("Authentication required", 401);

  const { slug } = await params;
  const contract = await ensureCanRead(slug, session);
  if (!contract) return apiError(`Contract "${slug}" not found`, 404);

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "csv";

  if (type === "pdf") {
    return new NextResponse(toPrintHtml(contract), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${contract.slug}.html"`,
      },
    });
  }

  if (type === "yaml") {
    return new NextResponse(contract.yamlRaw, {
      headers: {
        "Content-Type": "text/yaml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${contract.slug}.yaml"`,
      },
    });
  }

  const rows = flattenFields(contract.data.contract?.schema?.fields ?? []).map((field) => ({
    field: field.field,
    type: field.type,
    description: field.description,
    required: field.required,
    pii: field.pii,
    rules: field.rules,
    example: field.example,
  }));

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${contract.slug}.csv"`,
    },
  });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
