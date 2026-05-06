import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/shared/lib/providers";
import { NavBar } from "@/widgets/nav/nav-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "UltraCoach — AI Interview Coach",
  description:
    "Practice interviews with an AI interviewer and get feedback on what you say and how you carry yourself.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased min-h-screen no-scrollbar">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <NavBar />
            <main className="pt-16">{children}</main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
