import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExperienceCard } from "@/components/cv/experience-card";
import { RolePillars } from "@/components/cv/role-pillars";
import { SkillsTabs } from "@/components/cv/skills-tabs";
import {
  getExperiences,
  getProductDesigner,
  getSkills,
} from "@/lib/content";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const page = getProductDesigner(locale);

  return {
    title: t("productDesigner"),
    description: page.intro,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale
            ? "/product-designer"
            : `/${l}/product-designer`,
        ])
      ),
    },
  };
}

export default async function ProductDesignerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = getProductDesigner(locale);
  const { featured } = getExperiences(locale);
  const skills = getSkills(locale);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {page.title}
        </h1>
      </header>

      <section className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {page.roleTitle}
          </h2>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {page.intro}
          </p>
        </div>
        <RolePillars pillars={page.pillars} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {page.caseStudiesTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {page.caseStudiesIntro}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {page.caseStudies.map((study) => (
            <div
              key={study.title}
              className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5"
            >
              <p className="text-sm font-medium">{study.title}</p>
              <Badge variant="secondary" className="mt-2 font-normal">
                {study.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {page.skillsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {page.skillsIntro}
          </p>
        </div>
        <SkillsTabs skills={skills} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {page.experiencesTitle}
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {page.experiencesLead}
          </p>
        </div>
        <div className="space-y-4">
          {featured.map((exp) => (
            <ExperienceCard
              key={`${exp.company}-${exp.period}`}
              experience={exp}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
