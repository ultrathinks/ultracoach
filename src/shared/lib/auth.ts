import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import { db } from "../db";
import { accounts, partners, users } from "../db/schema";
import { authConfig } from "./auth.config";
import { syncPartnerAffiliation } from "./partners";

const ROLE_TTL_MS = 60_000;

function normalizeLocale(value: string | null | undefined): "ko" | "en" {
  return value === "en" ? "en" : "ko";
}

async function loadUserSnapshot(userId: string) {
  const [row] = await db
    .select({
      role: users.role,
      plan: users.plan,
      locale: users.locale,
      partnerId: partners.id,
      partnerLabelKo: partners.labelKo,
      partnerLabelEn: partners.labelEn,
      partnerActive: partners.active,
    })
    .from(users)
    .leftJoin(partners, eq(partners.id, users.partnerId))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return {
    role: row.role,
    plan: row.plan,
    locale: normalizeLocale(row.locale),
    partner:
      row.partnerId && row.partnerActive
        ? {
            id: row.partnerId,
            labelKo: row.partnerLabelKo ?? "",
            labelEn: row.partnerLabelEn ?? "",
          }
        : null,
  };
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.sub = user.id;
        if (user.email) {
          await syncPartnerAffiliation(user.id, user.email);
        }
        const fresh = await loadUserSnapshot(user.id);
        token.role = fresh?.role ?? "user";
        token.plan = fresh?.plan ?? "free";
        token.locale = fresh?.locale ?? "ko";
        token.partner = fresh?.partner ?? null;
        token.roleCheckedAt = Date.now();
        return token;
      }

      if (trigger === "update" && session?.user) {
        if (session.user.role) token.role = session.user.role;
        if (session.user.plan) token.plan = session.user.plan;
        if (session.user.locale) token.locale = session.user.locale;
        token.roleCheckedAt = Date.now();
        return token;
      }

      if (token.sub && Date.now() - (token.roleCheckedAt ?? 0) > ROLE_TTL_MS) {
        const fresh = await loadUserSnapshot(token.sub);
        if (fresh) {
          token.role = fresh.role;
          token.plan = fresh.plan;
          token.locale = fresh.locale;
          token.partner = fresh.partner;
          token.roleCheckedAt = Date.now();
        }
      }

      return token;
    },
  },
});
