import { HomeCtas } from "@/components/analytics/home-ctas";

export default function AccueilPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 py-16 md:min-h-[calc(100svh-1rem)] md:py-20">
      <section className="flex flex-col gap-8">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            En poste chez Worldline
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
            Je conçois des produits numériques
            <span className="block text-muted-foreground">
              clairs, accessibles et utiles.
            </span>
          </h1>

          <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
            Senior Product Designer chez Worldline. Je transforme des problèmes
            complexes en expériences simples. Audit, collab produit/tech, mise
            en prod. RGAA, design systems et prototypes avancés au quotidien.
          </p>
        </div>

        <HomeCtas />
      </section>
    </main>
  );
}
