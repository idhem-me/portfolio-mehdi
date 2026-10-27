"use client";
import type { Rarity } from "../../catalog/types";
import { isSpecialRarity, openingEffectTokens } from "../../feel/config";

/** Mounted only after the active card is face up; no timer or business transition. */
export function SpecialReveal({
  rarity,
  shiny = false,
  active,
  reduced,
}: {
  rarity: Rarity;
  shiny?: boolean;
  active: boolean;
  reduced: boolean;
}) {
  if (!active || reduced || (!shiny && !isSpecialRarity(rarity))) return null;
  const count = openingEffectTokens[rarity].particlesMobile;
  return (
    <div
      className={`cards-special-reveal cards-special-${rarity} ${shiny ? "cards-special-shiny" : ""}`}
      aria-hidden
    >
      <span className="cards-special-wave" />
      {shiny && (
        <div className="cards-shiny-burst">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} style={{ ["--star" as string]: index }}>
              ✦
            </span>
          ))}
        </div>
      )}
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="cards-special-particle"
          style={{ ["--i" as string]: i, ["--n" as string]: count }}
        />
      ))}
    </div>
  );
}
