import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Files,
  Palette,
  ImageDown,
  Images,
  QrCode,
  Gift,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

// Locale and translations are resolved for this route before rendering.
export const instant = false;

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return { title: t("title"), description: t("intro") };
}
export default async function ToolsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tools");
  const color = await getTranslations("colorGenerator");
  const compressor = await getTranslations("imageCompressor");
  const converter = await getTranslations("imageConverter");
  const qr = await getTranslations("qrGenerator");
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
      <a
        href={`${locale === "fr" ? "" : `/${locale}`}/outils/listes-cadeaux`}
        lang="fr"
        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Gift aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 space-y-2">
          <h2 className="font-semibold">Listes de cadeaux</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Toutes tes envies, toutes les boutiques. Un lien à partager avec tes
            proches.
          </p>
        </div>
      </a>
      <Link
        href="/outils/color-generator"
        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Palette aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 space-y-2">
          <h2 className="font-semibold">{color("title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{color("intro")}</p>
        </div>
      </Link>
      <Link
        href="/outils/fusion-pdf"
        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Files aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 space-y-2">
          <h2 className="font-semibold">{t("mergeTitle")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("mergeDescription")}
          </p>
        </div>
      </Link>
      <Link
        href="/outils/compression-image"
        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ImageDown aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 space-y-2">
          <h2 className="font-semibold">{compressor("title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{compressor("intro")}</p>
        </div>
      </Link>
      <Link
        href="/outils/conversion-image"
        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Images aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 space-y-2">
          <h2 className="font-semibold">{converter("title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{converter("intro")}</p>
        </div>
      </Link>
      <Link
        href="/outils/qrcode"
        className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <QrCode aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 space-y-2">
          <h2 className="font-semibold">{qr("title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{qr("intro")}</p>
        </div>
      </Link>
      </div>
    </main>
  );
}
