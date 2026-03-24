"use client";

import { cn } from "@/shared/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

const links = [
  { href: "/interview", label: "면접" },
  { href: "/history", label: "기록" },
];

function ProfileDropdown() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!session?.user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="cursor-pointer"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full ring-1 ring-white/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-card border border-border" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border py-2 shadow-lg z-50">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-sm font-medium truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-muted truncate">
              {session.user.email}
            </p>
          </div>
          <Link
            href="/history"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors"
          >
            면접 기록
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2.5 text-sm text-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

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
          {session?.user &&
            links.map((link) => (
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
            <ProfileDropdown />
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
