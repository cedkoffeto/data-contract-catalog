import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      givenName?: string;
      familyName?: string;
      permissions?: string[];
      pinnedSlugs?: string[];
      favoriteSlugs?: string[];
      subscriptionSlugs?: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    preferredUsername?: string;
    givenName?: string;
    familyName?: string;
    permissions?: string[];
    pinnedSlugs?: string[];
    favoriteSlugs?: string[];
    subscriptionSlugs?: string[];
  }
}
