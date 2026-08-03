import { DataModelClient } from "./DataModelClient";
import { PageShell } from "@/src/components/layout/PageShell";

export const metadata = {
  title: "Data Model Editor — Data Contract Catalog",
  description: "Interactive lineage graph for data contracts",
};

export default async function DataModelPage(props: {
  searchParams?: Promise<{ slug?: string; domain?: string; context?: string }>;
}) {
  const searchParams = await props.searchParams;
  const focusSlug = searchParams?.slug ?? null;
  const focusDomain = searchParams?.domain ?? null;
  const focusContext = searchParams?.context ?? null;

  return (
    <>
      <style>{`html, body { overflow: hidden !important; }`}</style>
      <PageShell showFooter={false} scrollable={false}>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <DataModelClient
            focusSlug={focusSlug}
            focusDomain={focusDomain}
            focusContext={focusContext}
          />
        </div>
      </PageShell>
    </>
  );
}
