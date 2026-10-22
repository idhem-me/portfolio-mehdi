import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompanyLogo } from "@/components/cv/company-logo";
import type { Experience } from "@/lib/content";

export function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            {experience.logo ? (
              <CompanyLogo
                logo={experience.logo}
                alt=""
                className="mt-0.5"
              />
            ) : null}
            <div className="min-w-0 space-y-1">
              <CardTitle>{experience.title}</CardTitle>
              <CardDescription className="text-foreground/80">
                {experience.company}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 font-normal">
            {experience.period}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{experience.location}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {experience.summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {experience.summary}
          </p>
        ) : null}
        {experience.highlights ? (
          <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
            {experience.highlights.map((item) => (
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
  );
}

export function ExperienceListItem({ experience }: { experience: Experience }) {
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {experience.logo ? (
          <CompanyLogo
            logo={experience.logo}
            alt=""
            className="mt-0.5"
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-medium">{experience.title}</p>
          <p className="text-sm text-muted-foreground">
            {experience.company} · {experience.location}
          </p>
        </div>
      </div>
      <p className="shrink-0 pl-10 text-xs text-muted-foreground sm:pl-0">
        {experience.period}
      </p>
    </li>
  );
}
