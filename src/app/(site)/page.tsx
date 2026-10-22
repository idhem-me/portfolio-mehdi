import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profile } from "@/data/resume";

export default function AccueilPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col justify-center px-6 py-16 md:min-h-[calc(100svh-1rem)] md:py-20">
      <section className="flex flex-col gap-8">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="size-1.5 rounded-full bg-emerald-500"
              aria-hidden
            />
            {profile.status}
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {profile.locations.join(" / ")}
            </span>
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Je conçois des produits numériques
            <span className="block text-muted-foreground">
              clairs, accessibles et utiles.
            </span>
          </h1>

          <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
            Product Designer UX/UI chez Worldline, je transforme des problèmes
            complexes en expériences simples — de l’audit à la mise en prod,
            en collab étroite avec produit et tech. Accessibilité RGAA, design
            systems et prototypes avancés font partie de mon quotidien.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/product-designer">
              Voir mon parcours design
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Me contacter</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
