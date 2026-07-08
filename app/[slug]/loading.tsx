export default function ContractDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="skeleton-pulse mb-4 h-8 w-64 rounded" />
      <div className="skeleton-pulse mb-8 h-4 w-96 rounded" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="skeleton-pulse h-6 w-32 rounded" />
          <div className="skeleton-pulse h-4 w-full rounded" />
          <div className="skeleton-pulse h-4 w-3/4 rounded" />
          <div className="skeleton-pulse h-4 w-1/2 rounded" />
        </div>
        <div className="space-y-3">
          <div className="skeleton-pulse h-6 w-32 rounded" />
          <div className="skeleton-pulse h-4 w-full rounded" />
          <div className="skeleton-pulse h-4 w-3/4 rounded" />
          <div className="skeleton-pulse h-4 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton-pulse mt-8 h-96 w-full rounded-lg" />
    </div>
  );
}
