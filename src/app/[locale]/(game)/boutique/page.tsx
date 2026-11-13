import { cookies } from "next/headers";
import { Suspense } from "react";
import { CardsGame } from "@/features/cards/client";
import { cardsEnabled } from "@/features/cards/flags";
import { isLocalGamePreview } from "@/lib/game-publication";
import { notFound } from "next/navigation";
export const metadata = {
  title: "Boutique · Cartes",
  robots: { index: false, follow: false },
};
export default function ShopPage() {
  if (!cardsEnabled && !isLocalGamePreview) notFound();
  return (
    <Suspense
      fallback={
        <p className="p-6" role="status">
          Chargement de la boutique…
        </p>
      }
    >
      <ThemedShop />
    </Suspense>
  );
}

async function ThemedShop() {
  const theme = (await cookies()).get("cards-theme")?.value;
  return (
    <CardsGame
      backHref="/jeux"
      initialTheme={theme === "blue" || theme === "red" ? theme : "default"}
    />
  );
}
