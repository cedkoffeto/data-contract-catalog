import Image from "next/image";

import { LoginForm } from "@/src/components/layout/LoginForm";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl =
    typeof searchParams?.callbackUrl === "string" &&
    searchParams.callbackUrl.startsWith("/") &&
    !searchParams.callbackUrl.startsWith("/api/auth") &&
    !searchParams.callbackUrl.startsWith("/realms/")
      ? searchParams.callbackUrl
      : "/";

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__brand">
          <Image alt="Attijariwafa bank" className="login-card__logo" height={48} priority src="/awb-icon.png" width={48} />
          <div>
            <p className="login-card__eyebrow">Secure workspace</p>
            <h1>Authentification</h1>
          </div>
        </div>

        <p className="login-card__copy">
          Connecte-toi avec ton compte Keycloak pour acceder a la plateforme.
        </p>

        <div className="login-card__form">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
