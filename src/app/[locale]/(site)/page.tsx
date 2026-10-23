import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { HomeCtas, HomeStatus } from "@/components/analytics/home-ctas";
import { GazeAvatar } from "@/components/creative/gaze-avatar";
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
            data-physics-compact
            className="inline-block rounded-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {part}
          </span>
        );
      })}
    </p>
  );
}

function HomeFallback() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 pt-[6.75rem] pb-16 md:min-h-[calc(100svh-1rem)] md:py-20">
      <div className="flex flex-col gap-8">
        <div className="space-y-4">
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-9 w-full max-w-xl animate-pulse rounded bg-muted" />
            <div className="h-9 w-2/3 max-w-lg animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full max-w-prose animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 max-w-prose animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 max-w-prose animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </main>
  );
}

async function HomeContent({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const home = getHome(locale);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 pt-[6.75rem] pb-16 md:min-h-[calc(100svh-1rem)] md:py-20">
      <GravityPlayground>
        <section className="flex flex-col gap-8">
          <div className="space-y-4">
            <HomeStatus />

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

          <div className="flex flex-col gap-8 md:gap-16">
            <HomeCtas />

            <GazeAvatar />
          </div>
        </section>
      </GravityPlayground>
    </main>
  );
}

export default function AccueilPage({ params }: Props) {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent params={params} />
    </Suspense>
  );
}
