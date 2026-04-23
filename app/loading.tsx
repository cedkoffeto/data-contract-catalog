export default function Loading() {
  return (
    <main className="page-loader" aria-label="Loading page">
      <div className="page-loader__content">
        <span>Loading</span>
        <div className="page-loader__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    </main>
  );
}
