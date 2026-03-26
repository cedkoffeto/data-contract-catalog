export function Footer({ version = "V1" }: { version?: string }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__title">Data Contracts</p>
        <div className="site-footer__meta">
          <span>Datalake{version ? ` ${version}` : ""}</span>
        </div>
      </div>
    </footer>
  );
}
