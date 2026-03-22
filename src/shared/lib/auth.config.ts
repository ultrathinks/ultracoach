import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
};
