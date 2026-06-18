const SESSION_COOKIE = "audit_session_id";

export function getClientSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_COOKIE);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_COOKIE, id);
    }
    document.cookie = `${SESSION_COOKIE}=${id}; path=/; SameSite=Lax`;
    return id;
  } catch {
    return "";
  }
}

export function extractSessionId(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}
