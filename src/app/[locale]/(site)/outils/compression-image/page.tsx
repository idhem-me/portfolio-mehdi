import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ImageCompressor } from "@/components/ImageCompressor";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageCompressor" });
  return { title: t("title"), description: t("intro") };
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
  const t = await getTranslations("imageCompressor");
  const tools = await getTranslations("tools");
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/outils"
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {tools("back")}
      </Link>
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("intro")}</p>
      </header>
      <ImageCompressor />
    </main>
  );
}
