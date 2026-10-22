import { setRequestLocale } from "next-intl/server";
import { HomeCtas } from "@/components/analytics/home-ctas";
import { getHome } from "@/lib/content";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccueilPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const home = getHome(locale);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 py-16 md:min-h-[calc(100svh-1rem)] md:py-20">
      <section className="flex flex-col gap-8">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {home.status}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/logos/worldline-logo-icon.svg"
              alt=""
              width={24}
              height={12}
              className="h-3 w-auto opacity-80 dark:invert"
              aria-hidden
            />
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {home.title}
            <span className="block text-muted-foreground">
              {home.titleMuted}
            </span>
          </h1>

          <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
            {home.intro}
          </p>
        </div>

        <HomeCtas />
      </section>
    </main>
  );
}
