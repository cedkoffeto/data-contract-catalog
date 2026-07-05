import { getServerSession, type NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { getUserPermissions } from "@/src/lib/rbac";
import { getPinnedSlugs, getUserFavoriteSlugs } from "@/src/lib/preferences";
import { getUserSubscriptions } from "@/src/lib/subscriptions";
import { writeAuditLog } from "@/src/lib/audit";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  providers: [
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
          const [perms, pinnedSlugs, favoriteSlugs, subscriptions] = await Promise.all([
            getUserPermissions(userId),
            getPinnedSlugs(userId),
            getUserFavoriteSlugs(userId),
            getUserSubscriptions(userId),
          ]);
          token.permissions = perms;
          token.pinnedSlugs = pinnedSlugs;
          token.favoriteSlugs = favoriteSlugs;
          token.subscriptionSlugs = subscriptions.map((s) => s.contract_slug);
        } catch (error) {
          console.error("[auth.jwt] Failed to fetch user data:", error);
          token.permissions = [];
          token.pinnedSlugs = [];
          token.subscriptionSlugs = [];
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
        if (Array.isArray(token.pinnedSlugs)) extra.pinnedSlugs = token.pinnedSlugs;
        if (Array.isArray(token.favoriteSlugs)) extra.favoriteSlugs = token.favoriteSlugs;
        if (Array.isArray(token.subscriptionSlugs)) extra.subscriptionSlugs = token.subscriptionSlugs;
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
