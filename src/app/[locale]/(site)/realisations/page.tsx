import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getRealisations } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const page = getRealisations(locale);

  return {
    title: t("realisations"),
    description: page.title,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale ? "/realisations" : `/${l}/realisations`,
        ])
      ),
    },
  };
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
        {page.caseStudies.map((study) => {
          const cardClass = cn(
            "w-full overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/5 transition-colors",
            study.slug && "hover:bg-muted/70 hover:ring-foreground/10"
          );
          const inner = (
            <>
              {study.cover ? (
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={study.cover.light}
                    alt={study.cover.alt}
                    className="aspect-[16/9] w-full object-cover object-top dark:hidden"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={study.cover.dark}
                    alt={study.cover.alt}
                    className="hidden aspect-[16/9] w-full object-cover object-top dark:block"
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
            <div key={study.title} className={cardClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </main>
  );
}
