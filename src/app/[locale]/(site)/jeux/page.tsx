import {
  clickerBurgerEnabled,
  clickerBurgerPublic,
} from "@/features/clicker-burger/flags";
import { notFound } from "next/navigation";
import { tetrisEnabled } from "@/features/tetris/flags";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { getGames } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { PlayerIdentityProvider } from "@/features/tetris/ui/player-identity";
import { PlayerProfileButton } from "@/features/tetris/ui/player-profile";
import { TetrisCover } from "@/features/tetris/ui/tetris-cover";

export const instant = false;
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!tetrisEnabled && !clickerBurgerEnabled) notFound();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const page = getGames(locale);

  return {
    title: t("games"),
    robots: { index: clickerBurgerPublic, follow: clickerBurgerPublic },
    description: page.title,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale ? "/jeux" : `/${l}/jeux`,
        ]),
      ),
    },
  };
}

export default async function GamesPage({ params }: Props) {
  if (!tetrisEnabled && !clickerBurgerEnabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getGames(locale);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {page.title}
        </h1>
        <PlayerIdentityProvider>
          <PlayerProfileButton />
        </PlayerIdentityProvider>
      </header>

      <div className="flex flex-col gap-4">
        {page.caseStudies.map((study) => {
          const cardClass = cn(
            "w-full overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/5 transition-colors",
            study.slug && "hover:bg-muted/70 hover:ring-foreground/10",
          );
          const inner = (
            <>
              {study.slug === "tetris" ? (
                <TetrisCover />
              ) : study.cover ? (
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
                href={`/jeux/${study.slug}`}
                className={cn(
                  cardClass,
                  "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
