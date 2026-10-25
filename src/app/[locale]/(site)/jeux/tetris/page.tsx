import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCaseStudy } from "@/lib/content";
import { tetrisEnabled, tetrisPublic } from "@/features/tetris/flags";
import { routing } from "@/i18n/routing";
import { Tetris } from "@/features/tetris/ui/tetris";
export const instant = false;
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!tetrisEnabled) notFound();
  const { locale } = await params;
  const study = getCaseStudy(locale, "tetris");
  return {
    title: study.title,
    description: study.tagline,
    robots: { index: tetrisPublic, follow: tetrisPublic },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          `${l === routing.defaultLocale ? "" : "/" + l}/jeux/tetris`,
        ]),
      ),
    },
  };
}
export default async function TetrisPage({ params }: Props) {
  if (!tetrisEnabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const study = getCaseStudy(locale, "tetris");
  return (
    <main>
      <header className="sr-only">
        <h1>{study.title}</h1>
        <p>{study.tagline}</p>
      </header>
      <Tetris information={study.sections} />
    </main>
  );
}
