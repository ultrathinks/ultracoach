import NextAuth from "next-auth";
import { authConfig } from "@/shared/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/api/((?!auth).*)"],
};
