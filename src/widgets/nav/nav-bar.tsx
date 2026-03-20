"use client";

import { Button } from "@/shared/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";
import { signIn, signOut, useSession } from "next-auth/react";

const links = [
  { href: "/", label: "홈" },
  { href: "/interview", label: "면접" },
  { href: "/history", label: "기록" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.04] bg-background/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-12 px-6">
        <Link href="/" className="text-sm font-bold gradient-text tracking-tight">
          UltraCoach
        </Link>

        <div className="flex items-center gap-0.5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1 text-[13px] rounded-md transition-colors",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted hover:text-secondary",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <div className="flex items-center gap-2.5">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-6 h-6 rounded-full ring-1 ring-white/10"
                />
              )}
              <button
                onClick={() => signOut()}
                className="text-[13px] text-muted hover:text-secondary transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Button size="sm" onClick={() => signIn("google")}>
              로그인
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
