import { DataModelClient } from "./DataModelClient";

export const metadata = {
  title: "Data Model Editor — Data Contract Catalog",
  description: "Interactive lineage graph for data contracts",
};

export default function DataModelPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Data Model Editor</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Interactive lineage graph — explore relationships between data contracts.
        </p>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <DataModelClient />
      </div>
    </div>
  );
}
