import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="site-nav">
      <div className="site-nav__inner">
        <div className="site-nav__brand-row">
          <Link className="site-nav__brand" href="/">
            <Image
              alt="Attijariwafa bank"
              className="site-nav__logo"
              height={40}
              priority
              src="/awb-icon.png"
              width={40}
            />
            <div className="site-nav__copy">
              <span className="site-nav__title">Data Contracts</span>
            </div>
          </Link>

          <div className="site-nav__actions">
            <div className="site-nav__links">
              <Link className="site-nav__link" href="/">
                Catalog
              </Link>
              <Link className="site-nav__link" href="/docs">
                Api
              </Link>
            </div>

            <Link className="site-nav__cta" href="/editor">
              Editor
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
