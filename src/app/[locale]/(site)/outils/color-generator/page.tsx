import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";
import type { Metadata } from "next";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ColorGenerator } from "@/features/color-generator/ui/ColorGenerator";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "colorGenerator" });
  return portfolioMetadata("/outils/color-generator", locale, { title: t("title"), description: t("intro") });
}
export default async function ColorGeneratorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("colorGenerator");
  const tools = await getTranslations("tools");
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <PageBreadcrumb
        current={t("title")}
        parents={[{ href: "/outils", label: tools("title") }]}
      />
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
