"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useT } from "@/src/lib/use-i18n";

export function LoginRedirect({ callbackUrl }: { callbackUrl: string }) {
  const { t } = useT();
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const autoLoginKey = `keycloak-auto-login:${callbackUrl}`;
    if (window.sessionStorage.getItem(autoLoginKey)) {
      setHasAutoStarted(true);
      return;
    }

    window.sessionStorage.setItem(autoLoginKey, "1");
    setHasAutoStarted(true);
    setIsStarting(true);
    void signIn("keycloak", { callbackUrl, redirect: true }).finally(() => {
      setIsStarting(false);
    });
  }, [callbackUrl]);

  return (
    <div className="login-actions">
      <button
        className="site-nav__cta"
        disabled={isStarting}
        onClick={() => {
          setIsStarting(true);
          void signIn("keycloak", { callbackUrl, redirect: true }).finally(() => {
            setIsStarting(false);
          });
        }}
        type="button"
      >
        {isStarting ? t("loginConnecting") : t("loginButton")}
      </button>
      {hasAutoStarted && !isStarting ? (
        <p className="login-actions__hint">{t("redirectHint")}</p>
      ) : null}
    </div>
  );
}
