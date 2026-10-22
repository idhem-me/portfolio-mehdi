import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {page.title}
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          {page.intro}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {page.experiencesTitle}
        </h2>
        <div className="space-y-4">
          {featured.map((exp) => (
            <Card key={`${exp.company}-${exp.period}`}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle>{exp.title}</CardTitle>
                    <CardDescription className="text-foreground/80">
                      {exp.company}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-normal">
                    {exp.period}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{exp.location}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {exp.summary ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {exp.summary}
                  </p>
                ) : null}
                {exp.highlights ? (
                  <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
                    {exp.highlights.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span
                          className="mt-2 size-1 shrink-0 rounded-full bg-foreground/30"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
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
    </main>
  );
}
