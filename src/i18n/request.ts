import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["ko", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_COOKIE = "ultracoach:language";

export async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (value === "ko" || value === "en") return value;

  const headerStore = await headers();
  const accept = headerStore.get("accept-language")?.toLowerCase() ?? "";
  return accept.startsWith("ko") ? "ko" : "en";
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
