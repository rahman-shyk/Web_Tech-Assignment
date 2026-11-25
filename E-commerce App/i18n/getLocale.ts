import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "@/i18n/messages";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const incomingHeaders = await headers();
  const accepted = incomingHeaders.get("accept-language")?.split(",")[0] ?? "";
  return accepted.toLowerCase().startsWith("ur") ? "ur" : "en";
}
