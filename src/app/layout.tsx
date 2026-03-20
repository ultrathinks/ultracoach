import type { Metadata } from "next";
import { Providers } from "@/shared/lib/providers";
import { NavBar } from "@/widgets/nav/nav-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "UltraCoach — AI 면접 코칭",
  description: "AI 면접관과 실전처럼 연습하고, 비언어적 피드백까지 받아보세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen">
        <Providers>
          <NavBar />
          <main className="pt-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
