export default function Loading() {
  const items = Array.from({ length: 12 });

  return (
    <main className="page-loader">
      <div className="page-loader__content">
        <span>Loading</span>
        <div className="page-loader__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "1rem",
        padding: "1.5rem 0",
      }}>
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
              padding: "1rem",
              borderRadius: "10px",
              background: "#fff",
              boxShadow: "0 14px 32px rgba(15,23,42,0.05)",
              opacity: 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <SkeletonBlock width="60px" height="1.65rem" radius="6px" />
                <SkeletonBlock width="80px" height="1.65rem" radius="6px" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <SkeletonBlock width="28px" height="0.8rem" radius="4px" />
                <SkeletonBlock width="14px" height="14px" radius="50%" />
                <SkeletonBlock width="14px" height="14px" radius="50%" />
                <SkeletonBlock width="14px" height="14px" radius="50%" />
              </div>
            </div>

            <SkeletonBlock width="70%" height="1.1rem" radius="4px" />
            <SkeletonBlock width="100%" height="0.75rem" radius="4px" />
            <SkeletonBlock width="85%" height="0.75rem" radius="4px" />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <SkeletonBlock width="90px" height="0.75rem" radius="4px" />
                <SkeletonBlock width="40px" height="0.6rem" radius="4px" />
              </div>
            </div>
          </div>
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
