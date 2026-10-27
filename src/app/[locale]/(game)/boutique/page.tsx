import { cookies } from "next/headers";
import { Suspense } from "react";
import { CardsGame } from "@/features/cards/client";
export const metadata = {
  title: "Boutique · Cartes",
  robots: { index: false, follow: false },
};
export default function ShopPage() {
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
