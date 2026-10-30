"use client";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/app-shell";
import { DesignSystemScope } from "@/components/design-system/provider";
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
  return (
    <AppShell>
      <DesignSystemScope>
        <Game backHref={backHref} />
      </DesignSystemScope>
    </AppShell>
  );
}
