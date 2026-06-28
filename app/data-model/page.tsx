import { DataModelClient } from "./DataModelClient";
import { PageShell } from "@/src/components/layout/PageShell";

export const metadata = {
  title: "Data Model Editor — Data Contract Catalog",
  description: "Interactive lineage graph for data contracts",
};

export default function DataModelPage() {
  return (
    <>
      <style>{`html { overflow: hidden !important; }`}</style>
      <PageShell showFooter={false}>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1">
            <DataModelClient />
          </div>
        </div>
      </PageShell>
    </>
  );
}
