export default function AdminLoading() {
  return (
    <div className="space-y-6 px-6 lg:px-8">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-pulse h-24 rounded-lg" />
        ))}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-pulse h-10 w-32 rounded" />
        ))}
      </div>
      <div className="skeleton-pulse h-64 w-full rounded-lg" />
    </div>
  );
}
