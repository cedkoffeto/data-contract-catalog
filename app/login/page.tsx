import Image from "next/image";

import { LoginForm } from "@/src/components/layout/LoginForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const resolved = await searchParams;
  const callbackUrl =
    typeof resolved?.callbackUrl === "string" &&
    resolved.callbackUrl.startsWith("/") &&
    !resolved.callbackUrl.startsWith("/api/auth") &&
    !resolved.callbackUrl.startsWith("/realms/")
      ? resolved.callbackUrl
      : "/";

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__brand">
          <Image alt="Attijariwafa bank" className="login-card__logo" height={48} priority src="/awb-icon.png" width={48} />
          <div>
            <p className="login-card__eyebrow">Data Contract Hub</p>
            <h1>Bienvenue</h1>
          </div>
        </div>

        <p className="login-card__copy">
          Connecte-toi pour acceder au catalogue des contrats, a l’editeur et a la documentation API.
        </p>

        <div className="login-card__form">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
