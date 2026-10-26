"use client";
import dynamic from "next/dynamic";
import "./game.css";
// Browser saves are loaded only after mount; no guest save is rendered on the server.
const Game = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => (
    <div className="p-6 text-sm text-muted-foreground" role="status">
      Chargement de Clicker Burger…
    </div>
  ),
});
export function ClickerBurger({ backHref }: { backHref: string }) {
  return <Game backHref={backHref} />;
}
