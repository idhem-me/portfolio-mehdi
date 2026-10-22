import { defineRouting } from "next-intl/routing";

export const locales = ["fr", "en", "zh", "ar", "es", "it", "de"] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  zh: "中文",
  ar: "العربية",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
};

export const rtlLocales: readonly Locale[] = ["ar"];

export function isRtlLocale(locale: string): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "fr",
  localePrefix: "as-needed",
});
