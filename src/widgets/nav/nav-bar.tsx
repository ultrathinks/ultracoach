"use client";

import { cn } from "@/shared/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

const links = [
  { href: "/interview", label: "면접" },
  { href: "/history", label: "기록" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <Link href="/" className="text-lg font-bold text-foreground">
          UltraCoach
        </Link>

        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted hover:text-secondary",
              )}
            >
              {link.label}
            </Link>
          ))}

          {session?.user ? (
            <Link href="/history">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-8 h-8 rounded-full ring-1 ring-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-card border border-border" />
              )}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => signIn("google")}
              className="px-4 py-1.5 text-sm font-medium rounded-full border border-border text-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
