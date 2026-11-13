import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ImageConverter } from "@/features/image-conversion/ui/image-converter";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageConverter" });
  return portfolioMetadata("/outils/conversion-image", locale, { title: t("title"), description: t("intro") });
}
export default function ToolPage(props: Props) {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12"
        >
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </main>
      }
    >
      <ToolContent {...props} />
    </Suspense>
  );
}
async function ToolContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("imageConverter");
  const tools = await getTranslations("tools");
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
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
      <ImageConverter />
    </main>
  );
}
