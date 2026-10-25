import { Separator } from "@/components/ui/separator";
import { ExperienceCard } from "@/components/cv/experience-card";
import { RolePillars } from "@/components/cv/role-pillars";
import { SkillsTabs } from "@/components/cv/skills-tabs";
import { getExperiences, getProductDesigner, getSkills } from "@/lib/content";

export function ProductDesignerContent({ locale }: { locale: string }) {
  const page = getProductDesigner(locale);
  const { featured } = getExperiences(locale);
  const skills = getSkills(locale);

  return (
    <div className="space-y-12">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {page.title}
        </h2>
      </header>

      <section className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight">
            {page.roleTitle}
          </h3>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {page.intro}
          </p>
        </div>
        <RolePillars pillars={page.pillars} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {page.skillsTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {page.skillsIntro}
          </p>
        </div>
        <SkillsTabs skills={skills} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">
            {page.experiencesTitle}
          </h3>
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
    </div>
  );
}
