import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

type UserRole = "user" | "admin" | "demo";
type UserPlan = "free" | "pro" | "premium";
type UserLocale = "ko" | "en";

interface PartnerInfo {
  id: string;
  labelKo: string;
  labelEn: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      plan: UserPlan;
      locale: UserLocale;
      partner: PartnerInfo | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    plan: UserPlan;
    locale: UserLocale;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: UserRole;
    plan: UserPlan;
    locale: UserLocale;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: UserRole;
    plan?: UserPlan;
    locale?: UserLocale;
    partner?: PartnerInfo | null;
    roleCheckedAt?: number;
  }
}
