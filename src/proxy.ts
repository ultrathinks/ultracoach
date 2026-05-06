import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/shared/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const isApi = req.nextUrl.pathname.startsWith("/api/");
    if (isApi) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/api/((?!auth).*)",
    "/interview",
    "/history",
    "/results/:path*",
    "/dashboard/:path*",
    "/drill/:path*",
  ],
};
