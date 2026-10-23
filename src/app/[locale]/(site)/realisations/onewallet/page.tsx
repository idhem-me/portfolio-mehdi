import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CaseStudyStory } from "@/components/case-study/case-study-story";
import { getCaseStudy } from "@/lib/content";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const study = getCaseStudy(locale, "onewallet");

  return {
    title: study.title,
    description: study.tagline,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale
            ? "/realisations/onewallet"
            : `/${l}/realisations/onewallet`,
        ])
      ),
    },
  };
}

export default async function OneWalletCaseStudyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const study = getCaseStudy(locale, "onewallet");

  return <CaseStudyStory study={study} />;
}
