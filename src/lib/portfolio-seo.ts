import type { Metadata } from "next";
import { profileMeta } from "@/data/profile-meta";
import { locales, routing } from "@/i18n/routing";

export const portfolioOrigin = "https://portfolio.mtmd.fr";

function localizedUrl(path: string, locale: string) {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const localizedPath = path === "/" ? prefix || "/" : `${prefix}${path}`;
  return new URL(localizedPath, portfolioOrigin).href;
}

export function portfolioAlternates(path: string, locale: string) {
  return {
    canonical: localizedUrl(path, locale),
    languages: {
      ...Object.fromEntries(locales.map((language) => [language, localizedUrl(path, language)])),
      "x-default": localizedUrl(path, routing.defaultLocale),
    },
  };
}

export function portfolioMetadata(
  path: string,
  locale: string,
  page: { title: string; description?: string },
): Metadata {
  const alternates = portfolioAlternates(path, locale);
  const isSiteTitle = page.title === profileMeta.siteTitle;
  return {
    ...page,
    title: isSiteTitle ? { absolute: page.title } : page.title,
    alternates,
    openGraph: {
      type: "website",
      siteName: profileMeta.siteTitle,
      title: isSiteTitle ? page.title : `${page.title} · ${profileMeta.siteTitle}`,
      description: page.description,
      url: alternates.canonical,
      images: [{
        url: `${portfolioOrigin}/img/photos/mehdi.jpg`,
        width: 413,
        height: 413,
        alt: profileMeta.name,
      }],
    },
  };
}
