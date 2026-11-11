import type { MetadataRoute } from "next";
import { clickerBurgerEnabled, clickerBurgerPublic } from "@/features/clicker-burger/flags";
import { locales } from "@/i18n/routing";
import { portfolioAlternates } from "@/lib/portfolio-seo";

const publicPages = [
  "/",
  "/a-propos",
  "/realisations",
  "/realisations/onewallet",
  "/realisations/trusted-interactions",
  "/contact",
  "/outils",
  "/outils/color-generator",
  "/outils/compression-image",
  "/outils/conversion-image",
  "/outils/fusion-pdf",
  "/outils/qrcode",
  "/jeux",
  "/jeux/pokemon",
  "/playground",
  "/playground/design-systems",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = clickerBurgerEnabled && clickerBurgerPublic
    ? [...publicPages, "/jeux/clicker-burger"]
    : publicPages;

  return paths.flatMap((path) => locales.map((locale) => {
    const { canonical, languages } = portfolioAlternates(path, locale);
    return { url: canonical, alternates: { languages } };
  }));
}
