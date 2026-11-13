import { ActiveThemeImage } from "@/components/media/active-theme-image";
import type { Metadata } from "next";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getRealisations } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const page = getRealisations(locale);

  return portfolioMetadata("/realisations", locale, {
    title: t("realisations"),
    description: page.title,
  });
}

export default async function RealisationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getRealisations(locale);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {page.title}
        </h1>
      </header>

      <div className="flex flex-col gap-4">
        {page.caseStudies.map((study, index) => {
          const cardClass = cn(
            "w-full overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/5 transition-colors",
            study.slug && "hover:bg-muted/70 hover:ring-foreground/10"
          );
          const inner = (
            <>
              {study.cover ? (
                <div className="relative aspect-video overflow-hidden">
                  <ActiveThemeImage
                    light={study.cover.light}
                    dark={study.cover.dark}
                    alt={study.cover.alt}
                    fill
                    sizes="(max-width: 767px) calc(100vw - 3rem), 720px"
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    className="object-cover object-top"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted/60">
                  <span className="text-sm text-muted-foreground">
                    {study.status}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 p-4">
                <p className="text-base font-medium">{study.title}</p>
                <Badge
                  variant={study.slug ? "default" : "secondary"}
                  className="shrink-0 font-normal"
                >
                  {study.status}
                </Badge>
              </div>
            </>
          );

          if (study.slug) {
            return (
              <Link
                key={study.title}
                href={`/realisations/${study.slug}`}
                prefetch={false}
                data-slot="portfolio-card"
                className={cn(
                  cardClass,
                  "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                {inner}
              </Link>
            );
          }

          return (
            <div key={study.title} data-slot="portfolio-card" className={cardClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </main>
  );
}
