import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { Problems } from "@/shared/lib/api-error";
import { authConfig } from "@/shared/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (!req.auth) {
    if (isApi) return Problems.unauthorized(pathname);
    return NextResponse.redirect(new URL("/", req.url));
  }

  const isAdminPath =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminPath && req.auth.user?.role !== "admin") {
    if (isApi) return Problems.forbidden(pathname);
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/api/((?!auth|webhooks|health).*)",
    "/interview",
    "/history",
    "/results/:path*",
    "/dashboard/:path*",
    "/drill/:path*",
    "/admin/:path*",
  ],
};
