"use client";

import { ArrowLeft } from "lucide-react";
import type { CaseStudyContent, CaseStudyImage } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { ScrollReveal } from "@/components/case-study/scroll-reveal";
import { CaseStudySlider } from "@/components/case-study/case-study-slider";
import { ImageLightboxProvider } from "@/components/case-study/image-lightbox";
import {
  ThemeImage,
  ThemeImageGroup,
} from "@/components/case-study/theme-image";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type CaseStudyStoryProps = {
  study: CaseStudyContent;
  children?: React.ReactNode;
};

function splitIndustrializeImages(images: CaseStudyImage[]) {
  const board: CaseStudyImage[] = [];
  const slider: CaseStudyImage[] = [];
  for (const image of images) {
    if (image.theme === "light" || image.theme === "dark") {
      slider.push(image);
    } else {
      board.push(image);
    }
  }
  return { board, slider };
}

export function CaseStudyStory({ study, children }: CaseStudyStoryProps) {
  const pairLabels = study.themeToggle;

  return (
    <ImageLightboxProvider>
    <article className="mx-auto w-full max-w-3xl space-y-16 px-6 py-12">
      <ScrollReveal>
        <Link
          href="/realisations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden />
          {study.backLabel}
        </Link>
      </ScrollReveal>

      <header className="space-y-4">
        <ScrollReveal>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {study.title}
          </h1>
        </ScrollReveal>
        <ScrollReveal delayMs={60}>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {study.tagline}
          </p>
        </ScrollReveal>
        <ScrollReveal delayMs={100}>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-1.5">
              <dt className="sr-only">Role</dt>
              <dd>{study.meta.role}</dd>
            </div>
            <div className="flex gap-1.5 before:text-foreground/20 before:content-['·']">
              <dt className="sr-only">Context</dt>
              <dd>{study.meta.context}</dd>
            </div>
            <div className="flex gap-1.5 before:text-foreground/20 before:content-['·']">
              <dt className="sr-only">Status</dt>
              <dd>{study.meta.status}</dd>
            </div>
          </dl>
        </ScrollReveal>
      </header>

      {children}

      {study.sections.map((section, index) => (
        <section key={section.id} className="space-y-6">
          {index > 0 ? <Separator className="mb-10" /> : null}

          <ScrollReveal>
            <h2 className="text-lg font-semibold tracking-tight">
              {section.title}
            </h2>
          </ScrollReveal>

          <div className="space-y-3">
            {section.body.map((paragraph, i) => (
              <ScrollReveal key={i} delayMs={40 + i * 50}>
                <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              </ScrollReveal>
            ))}
          </div>

          {section.images && section.images.length > 0 ? (
            section.layout === "before-after" ? (
              <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4">
                {section.images.map((image, i) => (
                  <ScrollReveal
                    key={image.src ?? image.alt}
                    delayMs={80 + i * 120}
                    className="h-full min-w-0"
                  >
                    <ThemeImage
                      image={image}
                      aspectClassName="aspect-[4/3]"
                      objectPosition={i === 0 ? "bottom" : "center"}
                    />
                  </ScrollReveal>
                ))}
              </div>
            ) : section.layout === "industrialize" ? (
              (() => {
                const { board, slider } = splitIndustrializeImages(
                  section.images
                );
                return (
                  <div className="space-y-6">
                    {board.length > 0 ? (
                      <ScrollReveal delayMs={80}>
                        <ThemeImageGroup images={board} />
                      </ScrollReveal>
                    ) : null}
                    {slider.length > 0 ? (
                      <ScrollReveal delayMs={120}>
                        <CaseStudySlider
                          images={slider}
                          pairLabels={pairLabels}
                        />
                      </ScrollReveal>
                    ) : null}
                  </div>
                );
              })()
            ) : section.id === "user-tests" ? (
              <div className="space-y-4">
                <ScrollReveal delayMs={80}>
                  <ThemeImage image={section.images[0]!} />
                </ScrollReveal>
                {section.images.length > 1 ? (
                  <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4">
                    {section.images.slice(1).map((image, i) => (
                      <ScrollReveal
                        key={image.src ?? image.alt}
                        delayMs={120 + i * 80}
                        className="h-full min-w-0"
                      >
                        <ThemeImage
                          image={image}
                          aspectClassName="aspect-[9/16]"
                          objectPosition={i === 0 ? "bottom" : "center"}
                        />
                      </ScrollReveal>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <ScrollReveal delayMs={80}>
                <ThemeImageGroup
                  images={section.images}
                  priority={section.id === "hero"}
                  pairLabels={pairLabels}
                />
              </ScrollReveal>
            )
          ) : null}

          {section.cta ? (
            <div className="pt-2">
              <Link
                href={section.cta.href}
                className={cn(buttonVariants({ variant: "accent", size: "lg" }))}
              >
                {section.cta.label}
              </Link>
            </div>
          ) : null}
        </section>
      ))}
    </article>
    </ImageLightboxProvider>
  );
}
