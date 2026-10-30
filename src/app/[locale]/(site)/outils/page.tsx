import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Files, ArrowRight, Palette } from "lucide-react";
import { Link } from "@/i18n/navigation";

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
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      <Link
        href="/outils/color-generator"
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Palette aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="font-semibold">{color("title")}</h2>
          <p className="text-sm text-muted-foreground">{color("intro")}</p>
        </div>
        <ArrowRight
          aria-hidden="true"
          className="size-5 shrink-0 rtl:rotate-180"
        />
      </Link>
      <Link
        href="/outils/fusion-pdf"
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Files aria-hidden="true" className="size-6 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="font-semibold">{t("mergeTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("mergeDescription")}
          </p>
        </div>
        <ArrowRight
          aria-hidden="true"
          className="size-5 shrink-0 rtl:rotate-180"
        />
      </Link>
    </main>
  );
}
