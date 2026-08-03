import Image from "next/image";

import { LoginForm } from "@/src/components/layout/LoginForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const resolved = await searchParams;
  const raw = resolved?.callbackUrl;
  const callbackUrl =
    typeof raw === "string" &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/api/auth") &&
    !raw.startsWith("/realms/") &&
    !raw.includes("@") &&
    !/[?&]/.test(raw.slice(1)) &&
    /^\/[\w/%-]+$/.test(raw)
      ? raw
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
