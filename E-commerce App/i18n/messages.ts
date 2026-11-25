export const locales = ["en", "ur"] as const;
export type Locale = (typeof locales)[number];

export const messages = {
  en: {
    appName: "Commerce SaaS",
    welcome: "Welcome to your storefront",
    platform: "Platform",
    tenant: "Tenant",
    storefront: "Storefront",
  },
  ur: {
    appName: "کامرس SaaS",
    welcome: "آپ کے اسٹور فرنٹ میں خوش آمدید",
    platform: "پلیٹ فارم",
    tenant: "ٹیننٹ",
    storefront: "اسٹور فرنٹ",
  },
} satisfies Record<Locale, Record<string, string>>;

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
