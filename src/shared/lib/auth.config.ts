import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge runtime 호환 설정.
 * proxy.ts에서 import되므로 DB 의존 절대 추가 금지.
 * DB 재조회가 필요한 콜백은 auth.ts에 위치.
 */
export const authConfig: NextAuthConfig = {
  providers: [Google],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        if (user.role) token.role = user.role;
        if (user.plan) token.plan = user.plan;
        if (user.locale) token.locale = user.locale;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role ?? "user";
        session.user.plan = token.plan ?? "free";
        session.user.locale = token.locale ?? "ko";
        session.user.partner = token.partner ?? null;
      }
      return session;
    },
  },
};
