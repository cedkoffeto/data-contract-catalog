"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Identifiant ou mot de passe incorrect.");
      return;
    }

    window.location.assign(result?.url || callbackUrl);
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="login-field">
        <span>Nom d’utilisateur</span>
        <input autoComplete="username" name="username" placeholder="contract.user" required type="text" />
      </label>

      <label className="login-field">
        <span>Mot de passe</span>
        <input autoComplete="current-password" name="password" placeholder="••••••••" required type="password" />
      </label>

      {error ? <p className="login-form__error">{error}</p> : null}

      <button className="login-form__submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
