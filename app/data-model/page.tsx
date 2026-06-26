import { DataModelClient } from "./DataModelClient";
import { PageShell } from "@/src/components/layout/PageShell";

export const metadata = {
  title: "Data Model Editor — Data Contract Catalog",
  description: "Interactive lineage graph for data contracts",
};

export default function DataModelPage() {
  return (
    <PageShell footerVersion="">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-2">
          <h1 className="text-lg font-bold text-gray-900">Data Model Editor</h1>
          <p className="text-xs text-gray-500">
            Interactive lineage graph — explore relationships between data contracts.
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <DataModelClient />
        </div>
      </div>
    </PageShell>
  );
}
