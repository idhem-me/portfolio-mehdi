import type { Metadata } from "next";
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
import { caseStudiesSoon, featuredExperiences } from "@/data/resume";

export const metadata: Metadata = {
  title: "Product designer",
};

export default function ProductDesignerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Product designer
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          Expériences UX/UI chez Worldline et en freelance, avec un focus
          produits digitaux, design systems et accessibilité.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Expériences</h2>
        <div className="space-y-4">
          {featuredExperiences.map((exp) => (
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
          <h2 className="text-lg font-semibold tracking-tight">Réalisations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Études de cas détaillées à venir.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {caseStudiesSoon.map((study) => (
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
          <h2 className="text-lg font-semibold tracking-tight">Compétences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            UX, UI, gestion de projet, soft skills et outils.
          </p>
        </div>
        <SkillsTabs />
      </section>
    </main>
  );
}
