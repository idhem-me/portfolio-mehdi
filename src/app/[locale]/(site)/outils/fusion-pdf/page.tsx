import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";
import type { Metadata } from "next";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { PdfMerger } from "@/features/pdf/pdf-merger";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tools" });
  return portfolioMetadata("/outils/fusion-pdf", locale, { title: t("mergeTitle"), description: t("mergeDescription") });
}
export default async function MergePdfPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tools");
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-12">
      <PageBreadcrumb
        current={t("mergeTitle")}
        parents={[{ href: "/outils", label: t("title") }]}
      />
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("mergeTitle")}</h1>
        <p className="text-muted-foreground">{t("mergeDescription")}</p>
        <p className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{t("privacy")}</p>
      </header>
      <PdfMerger />
    </main>
  );
}
