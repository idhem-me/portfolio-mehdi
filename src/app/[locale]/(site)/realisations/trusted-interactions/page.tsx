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
  const study = getCaseStudy(locale, "trusted-interactions");

  return {
    title: study.title,
    description: study.tagline,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale
            ? "/realisations/trusted-interactions"
            : `/${l}/realisations/trusted-interactions`,
        ])
      ),
    },
  };
}

export default async function TrustedInteractionsCaseStudyPage({
  params,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const study = getCaseStudy(locale, "trusted-interactions");

  return <CaseStudyStory study={study} />;
}
