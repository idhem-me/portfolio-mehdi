import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  education,
  interests,
  languages,
  previousExperiences,
  profile,
} from "@/data/resume";

export const metadata: Metadata = {
  title: "À propos de moi",
};

export default function AProposPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          À propos de moi
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          {profile.bio}
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Parcours Business & International
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Avant le design produit : commerce, business development et
            expériences à l’étranger.
          </p>
        </div>
        <ul className="space-y-0 divide-y divide-border/60">
          {previousExperiences.map((exp) => (
            <li
              key={`${exp.company}-${exp.period}`}
              className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <div>
                <p className="text-sm font-medium">{exp.title}</p>
                <p className="text-sm text-muted-foreground">
                  {exp.company} · {exp.location}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {exp.period}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Formations, langues & intérêts
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5 sm:col-span-2">
            <h3 className="mb-3 text-sm font-medium">Formations</h3>
            <ul className="space-y-3">
              {education.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.school}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.period}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
            <h3 className="mb-3 text-sm font-medium">Langues</h3>
            <ul className="space-y-2">
              {languages.map((lang) => (
                <li
                  key={lang.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{lang.name}</span>
                  <Badge variant="outline" className="font-normal">
                    {lang.level}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
            <h3 className="mb-3 text-sm font-medium">Centres d&apos;intérêt</h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
