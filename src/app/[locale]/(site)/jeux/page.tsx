import { cardsEnabled } from "@/features/cards/flags";
import {
  clickerBurgerEnabled,
  clickerBurgerPublic,
} from "@/features/clicker-burger/flags";
import { notFound } from "next/navigation";
import { tetrisEnabled } from "@/features/tetris/flags";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Blocks, Gamepad2, Hamburger, PlayingCardsFan } from "lucide-react";
import { getGames } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { PlayerIdentityProvider } from "@/features/tetris/ui/player-identity";
import { PlayerProfileButton } from "@/features/tetris/ui/player-profile";

export const instant = false;
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!tetrisEnabled && !clickerBurgerEnabled && !cardsEnabled) notFound();
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
  if (!tetrisEnabled && !clickerBurgerEnabled && !cardsEnabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getGames(locale);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {page.title}
          </h1>
          <PlayerIdentityProvider>
            <PlayerProfileButton />
          </PlayerIdentityProvider>
        </div>
        <p className="text-muted-foreground">{page.intro}</p>
      </header>

      <div className="space-y-8">
        {page.caseStudies.map((study) => {
          const Icon = study.slug === "clicker-burger"
            ? Hamburger
            : study.slug === "tetris"
              ? Blocks
              : study.slug === "cards"
                ? PlayingCardsFan
                : Gamepad2;
          const cardClass = cn(
            "flex items-center gap-4 rounded-xl border border-border bg-card p-5",
            study.slug && "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          );
          const inner = (
            <>
              <Icon aria-hidden="true" className="size-6 shrink-0 text-accent" />
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="font-semibold">{study.title}</h2>
                <p className="text-sm text-muted-foreground">{study.status}</p>
              </div>
              {study.slug ? (
                <ArrowRight aria-hidden="true" className="size-5 shrink-0 rtl:rotate-180" />
              ) : null}
            </>
          );

          if (study.slug) {
            return (
              <Link
                key={study.title}
                href={`/jeux/${study.slug}`}
                className={cardClass}
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
