import { setRequestLocale } from "next-intl/server";
import { HomeCtas } from "@/components/analytics/home-ctas";
import { GravityPlayground } from "@/components/creative/gravity-playground";
import { getHome } from "@/lib/content";

type Props = {
  params: Promise<{ locale: string }>;
};

function IntroWords({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);

  return (
    <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) {
          return <span key={i}>{part}</span>;
        }
        return (
          <span
            key={i}
            data-physics-item
            className="inline-block rounded-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {part}
          </span>
        );
      })}
    </p>
  );
}

export default async function AccueilPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const home = getHome(locale);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 py-16 md:min-h-[calc(100svh-1rem)] md:py-20">
      <GravityPlayground>
        <section className="flex flex-col gap-8">
          <div className="space-y-4">
            <p
              data-physics-item
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg text-sm text-muted-foreground"
            >
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

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span
                data-physics-item
                className="inline-block whitespace-nowrap rounded-lg text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              >
                {home.title}
              </span>
              <span
                data-physics-item
                data-physics-split-lines
                className="mt-1 inline-block max-w-full rounded-lg text-3xl font-semibold tracking-tight text-muted-foreground sm:text-4xl"
              >
                {home.titleMuted}
              </span>
            </h1>

            <IntroWords text={home.intro} />
          </div>

          <HomeCtas />
        </section>
      </GravityPlayground>
    </main>
  );
}
