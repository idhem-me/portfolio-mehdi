import type { Metadata } from "next";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { setRequestLocale } from "next-intl/server";
import { CaseStudyStory } from "@/features/case-study/ui/case-study-story";
import { getCaseStudy } from "@/lib/content";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const study = getCaseStudy(locale, "trusted-interactions");

  return portfolioMetadata("/realisations/trusted-interactions", locale, {
    title: study.title,
    description: study.tagline,
  });
}

export default async function TrustedInteractionsCaseStudyPage({
  params,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const study = getCaseStudy(locale, "trusted-interactions");

  return <CaseStudyStory study={study} />;
}
