import { requireAdmin } from "@/src/lib/require-admin";
import { countAuditLogs, listAuditLogs, cleanupAuditLogs } from "@/src/lib/audit";
import { withErrorHandling } from "@/src/lib/with-error-handling";

export const dynamic = "force-dynamic";

async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0"));
  const pageSize = Math.min(1000, Math.max(1, Number(url.searchParams.get("pageSize") ?? "10")));
  const sortKey = url.searchParams.get("sortKey") ?? "created_at";
  const sortDir = (url.searchParams.get("sortDir") ?? "desc") as "asc" | "desc";
  const search = url.searchParams.get("search") ?? "";

  const [total, items] = await Promise.all([
    countAuditLogs(search || undefined),
    listAuditLogs({ page, pageSize, sortKey, sortDir, search: search || undefined }),
  ]);

  cleanupAuditLogs().catch(() => {});

  return Response.json({ items, total });
}

export const GET_handler = withErrorHandling(GET);
export { GET_handler as GET };
