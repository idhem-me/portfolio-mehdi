import { Layers3, Sparkles } from "lucide-react";
import { CARD_SETS, type CardSetId } from "../../catalog/cards";

/** The same full wrapper is used in the gallery and both pieces of the torn pack. */
export function BoosterArtwork({
  setId,
  showCollection = true,
}: {
  setId: CardSetId;
  showCollection?: boolean;
}) {
  const set = CARD_SETS.find((entry) => entry.id === setId)!;
  return (
    <div
      className={`cards-selector-pack cards-booster-artwork-${setId}`}
      aria-hidden="true"
    >
      {showCollection && (
        <span className="cards-selector-seal">
          Collection · {setId === "origins" ? "01" : "02"}
        </span>
      )}
      {setId === "origins" ? <Layers3 /> : <Sparkles />}
      <strong>{set.name}</strong>
    </div>
  );
}
