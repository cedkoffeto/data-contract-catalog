import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import KeycloakProvider from "next-auth/providers/keycloak";
import { getUserPermissions } from "@/src/lib/rbac";
import { writeAuditLog } from "@/src/lib/audit";

type KeycloakTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type KeycloakUserInfo = {
  sub?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
};

function getKeycloakIssuer() {
  return (process.env.AUTH_KEYCLOAK_ISSUER ?? "").replace(/\/$/, "");
}

async function authenticateWithKeycloak(username: string, password: string) {
  const issuer = getKeycloakIssuer();
  const clientId = process.env.AUTH_KEYCLOAK_ID ?? "";
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET ?? "";

  if (!issuer || !clientId || !clientSecret) {
    throw new Error("Keycloak authentication is not configured");
  }

  const tokenResponse = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password,
      scope: "openid email profile"
    }),
    cache: "no-store"
  });

  const tokenPayload = (await tokenResponse.json()) as KeycloakTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || "Invalid credentials");
  }

  const userInfoResponse = await fetch(`${issuer}/protocol/openid-connect/userinfo`, {
    headers: {
      authorization: `Bearer ${tokenPayload.access_token}`
    },
    cache: "no-store"
  });

  if (!userInfoResponse.ok) {
    throw new Error("Unable to load authenticated user profile");
  }

  const userInfo = (await userInfoResponse.json()) as KeycloakUserInfo;

  return {
    id: userInfo.sub ?? userInfo.preferred_username ?? username,
    name: userInfo.preferred_username ?? userInfo.name ?? username,
    email: userInfo.email ?? null,
    givenName: userInfo.given_name ?? null,
    familyName: userInfo.family_name ?? null,
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token ?? null
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Keycloak credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;

        if (!username || !password) {
          return null;
        }

        try {
          return await authenticateWithKeycloak(username, password);
        } catch (error) {
          console.error("[auth.credentials] Keycloak login failed", {
            message: error instanceof Error ? error.message : "Unknown authentication error"
          });
          writeAuditLog({
            action: "auth.login_failed",
            actorId: username,
            targetType: "user",
            targetId: username,
            details: { error: error instanceof Error ? error.message : "Unknown" },
          }).catch(() => {});
          return null;
        }
      }
    }),
    KeycloakProvider({
      clientId: process.env.AUTH_KEYCLOAK_ID ?? "",
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET ?? "",
      issuer: process.env.AUTH_KEYCLOAK_ISSUER ?? ""
    })
  ],
  callbacks: {
    async jwt({ token, profile, user }) {
      if (profile && typeof profile === "object") {
        const preferredUsername =
          "preferred_username" in profile && typeof profile.preferred_username === "string"
            ? profile.preferred_username
            : undefined;

        if (preferredUsername) {
          token.preferredUsername = preferredUsername;
        }

        const givenName =
          "given_name" in profile && typeof profile.given_name === "string"
            ? profile.given_name
            : undefined;

        const familyName =
          "family_name" in profile && typeof profile.family_name === "string"
            ? profile.family_name
            : undefined;

        if (givenName) token.givenName = givenName;
        if (familyName) token.familyName = familyName;
      }

      if (user) {
        if (typeof user.name === "string") token.preferredUsername = user.name;
        if ("givenName" in user && typeof user.givenName === "string") token.givenName = user.givenName;
        if ("familyName" in user && typeof user.familyName === "string") token.familyName = user.familyName;
      }

      // Enrich JWT with global role-based permissions on login/refresh
      const userId = token.preferredUsername as string | undefined;
      if (userId && !token.permissions) {
        try {
          const perms = await getUserPermissions(userId);
          token.permissions = perms;
        } catch (error) {
          console.error("[auth.jwt] Failed to fetch permissions:", error);
          token.permissions = [];
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.preferredUsername === "string") {
        session.user.name = token.preferredUsername;
      }

      if (session.user) {
        const extra = session.user as Record<string, unknown>;
        if (typeof token.givenName === "string") extra.givenName = token.givenName;
        if (typeof token.familyName === "string") extra.familyName = token.familyName;
        if (Array.isArray(token.permissions)) extra.permissions = token.permissions;
      }

      return session;
    }
  },
  events: {
    async signIn({ user }) {
      if (!user?.name) return;
      try {
        await writeAuditLog({
          action: "auth.login",
          actorId: user.name,
          targetType: "user",
          targetId: user.name,
        });
      } catch { /* silent */ }
    },
    async signOut({ session }) {
      const userId = session?.user?.name;
      if (!userId) return;
      try {
        await writeAuditLog({
          action: "auth.logout",
          actorId: userId,
          targetType: "user",
          targetId: userId,
        });
      } catch { /* silent */ }
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
