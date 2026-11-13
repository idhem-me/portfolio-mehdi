import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";
import type { Metadata } from "next";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Blocks, Gamepad2, Hamburger, PlayingCardsFan } from "lucide-react";
import { getGames } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PlayerIdentityProvider } from "@/features/tetris/ui/player-identity";
import { PlayerProfileButton } from "@/features/tetris/ui/player-profile";

export const instant = false;
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const page = getGames(locale);

  return portfolioMetadata("/jeux", locale, {
    title: t("games"),
    description: page.title,
  });
}

export default async function GamesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getGames(locale);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12">
      <PageBreadcrumb current={page.title} />
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {page.title}
          </h1>
          <PlayerIdentityProvider>
            <PlayerProfileButton hideNickname showHelp={false} />
          </PlayerIdentityProvider>
        </div>
        <p className="text-muted-foreground">{page.intro}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {page.caseStudies.map((study) => {
          const Icon =
            study.slug === "clicker-burger"
              ? Hamburger
              : study.slug === "tetris"
                ? Blocks
                : study.slug === "cards"
                  ? PlayingCardsFan
                  : Gamepad2;
          const cardClass = cn(
            "flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6",
            study.slug &&
              "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          );
          const inner = (
            <>
              <Icon aria-hidden="true" className="size-6 shrink-0 text-accent" />
              <div className="min-w-0 space-y-2">
                <h2 className="font-semibold">{study.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {study.status}
                </p>
              </div>
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
