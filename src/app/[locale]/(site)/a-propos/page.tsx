import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductDesignerContent } from "@/components/cv/product-designer-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ExperienceCard,
  ExperienceListItem,
} from "@/components/cv/experience-card";
import { getAbout, getExperiences, getProfile } from "@/lib/content";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const profile = getProfile(locale);

  return {
    title: t("about"),
    description: profile.bio,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale ? "/a-propos" : `/${l}/a-propos`,
        ]),
      ),
    },
  };
}

export default async function AProposPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const about = getAbout(locale);
  const profile = getProfile(locale);
  const { featured, previous } = getExperiences(locale);

  const tNav = await getTranslations({ locale, namespace: "nav" });
  const tTabs = await getTranslations({ locale, namespace: "aboutTabs" });
  const photoAlt = tNav("photoAlt", { name: profile.name });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-12">
      <header className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {about.title}
        </h1>
        <div className="w-fit overflow-hidden rounded-xl ring-1 ring-foreground/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/photos/moi/mehdi-light.png?v=20261023-2"
            alt={photoAlt}
            width={260}
            height={400}
            className="block h-auto w-[260px] dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/photos/moi/mehdi-dark.png?v=20261023-2"
            alt={photoAlt}
            width={260}
            height={400}
            className="hidden h-auto w-[260px] dark:block"
          />
        </div>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          {profile.bio}
        </p>
      </header>

      <Tabs defaultValue="product-designer" className="w-full gap-8">
        <TabsList aria-label={tNav("about")} className="max-w-full">
          <TabsTrigger value="product-designer" className="px-3">
            {tNav("productDesigner")}
          </TabsTrigger>
          <TabsTrigger value="career" className="px-3">
            {tTabs("career")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="product-designer">
          <ProductDesignerContent locale={locale} />
        </TabsContent>
        <TabsContent value="career" className="space-y-12">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {about.designTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {about.designIntro}
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

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {about.businessTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {about.businessIntro}
              </p>
            </div>
            <ul className="space-y-0 divide-y divide-border/60">
              {previous.map((exp) => (
                <ExperienceListItem
                  key={`${exp.company}-${exp.period}`}
                  experience={exp}
                />
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">
              {about.extrasTitle}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5 sm:col-span-2">
                <h3 className="mb-3 text-sm font-medium">
                  {about.educationTitle}
                </h3>
                <ul className="space-y-3">
                  {about.education.map((item) => (
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
                      <p className="text-xs text-muted-foreground">
                        {item.period}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
                <h3 className="mb-3 text-sm font-medium">
                  {about.languagesTitle}
                </h3>
                <ul className="space-y-2">
                  {about.languages.map((lang) => (
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
                <h3 className="mb-3 text-sm font-medium">
                  {about.interestsTitle}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {about.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
