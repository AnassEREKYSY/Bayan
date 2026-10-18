import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale, localeCookie, type Locale } from "./config";

/**
 * Locale resolution without URL prefixes:
 * cookie (set from the language switcher or the user's profile)
 * → browser Accept-Language → French.
 */
async function resolveLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(localeCookie)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const accept = (await headers()).get("accept-language") ?? "";
  const preferred = accept.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  if (isLocale(preferred)) return preferred;

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Africa/Casablanca",
  };
});
