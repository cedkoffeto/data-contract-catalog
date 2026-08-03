export default function Loading() {
  const items = Array.from({ length: 12 });

  return (
    <main>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "1rem",
        padding: "1.5rem",
      }}>
        {items.map((_, i) => (
          <li key={i} className="catalog-card-listing" data-accessible="true" style={{ listStyle: "none" }}>
            <div className="catalog-card" style={{ pointerEvents: "none" }}>
              <div className="catalog-card__header">
                <div className="catalog-card__meta" style={{ gap: "0.4rem" }}>
                  <SkeletonBlock width="60px" height="1.65rem" radius="6px" />
                  <SkeletonBlock width="80px" height="1.65rem" radius="6px" />
                </div>
                <div className="catalog-card__actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <SkeletonBlock width="28px" height="0.8rem" radius="4px" />
                  <SkeletonBlock width="14px" height="14px" radius="50%" />
                  <SkeletonBlock width="14px" height="14px" radius="50%" />
                  <SkeletonBlock width="14px" height="14px" radius="50%" />
                </div>
              </div>
              <div className="catalog-card__body">
                <h3 className="catalog-card__title">
                  <SkeletonBlock width="70%" height="1.1rem" radius="4px" />
                </h3>
                <div style={{ marginTop: "0.5rem" }}>
                  <SkeletonBlock width="100%" height="0.75rem" radius="4px" />
                  <div style={{ marginTop: "0.25rem" }}>
                    <SkeletonBlock width="85%" height="0.75rem" radius="4px" />
                  </div>
                </div>
              </div>
              <div className="catalog-card__footer">
                <div className="catalog-card__owner-block">
                  <SkeletonBlock width="90px" height="0.75rem" radius="4px" />
                  <div style={{ marginTop: "0.2rem" }}>
                    <SkeletonBlock width="40px" height="0.6rem" radius="4px" />
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </div>
    </main>
  );
}

function SkeletonBlock({ width, height, radius }: { width: string; height: string; radius: string }) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s ease-in-out infinite",
        flexShrink: 0,
      }}
    />
  );
}
