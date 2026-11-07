import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ColorGenerator } from "@/features/color-generator/ui/ColorGenerator";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "colorGenerator" });
  return { title: t("title"), description: t("intro") };
}
export default async function ColorGeneratorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("colorGenerator");
  const tools = await getTranslations("tools");
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <Button asChild variant="ghost" size="sm">
        <Link href="/outils">
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {tools("back")}
        </Link>
      </Button>
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("intro")}</p>
      </header>
      <ColorGenerator />
    </main>
  );
}
