"use client";

import dynamic from "next/dynamic";
import "./ui/game.css";

const Game = dynamic(() => import("./ui/app"), {
  ssr: false,
  loading: () => (
    <div className="p-6 text-sm text-muted-foreground" role="status">
      Chargement de Cartes…
    </div>
  ),
});

export function CardsGame({
  backHref,
  initialTheme,
}: {
  backHref: string;
  initialTheme?: string;
}) {
  return <Game backHref={backHref} initialTheme={initialTheme} />;
}
