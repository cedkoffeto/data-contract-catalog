"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [isStarting, setIsStarting] = useState(false);

  return (
    <div className="login-form">
      <p className="login-card__copy">
        Authentification via le fournisseur d&apos;identité Keycloak.
      </p>
      <button
        className="login-form__submit"
        disabled={isStarting}
        onClick={() => {
          setIsStarting(true);
          void signIn("keycloak", { callbackUrl, redirect: true });
        }}
        type="button"
      >
        {isStarting ? "Redirection..." : "Se connecter avec Keycloak"}
      </button>
    </div>
  );
}
