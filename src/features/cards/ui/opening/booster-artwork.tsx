import type { CardSetId } from "../../catalog/cards";

/** Sachet wrapper shared by the gallery and both halves of the torn pack. */
export function BoosterArtwork({
  setId,
}: {
  setId: CardSetId;
  /** @deprecated Kept for call-site compatibility; branding lives on the future image. */
  showCollection?: boolean;
}) {
  return (
    <div
      className={`cards-selector-pack cards-booster-artwork-${setId}`}
      data-booster-art={setId}
      aria-hidden="true"
    >
      <span className="cards-booster-tip cards-booster-tip-top" />
      <span className="cards-booster-crimp cards-booster-crimp-top" />
      <div className="cards-booster-face">
        {/* Swap for a set artwork <img> when assets are ready. */}
        <div className="cards-booster-art-placeholder" />
      </div>
      <span className="cards-booster-crimp cards-booster-crimp-bottom" />
      <span className="cards-booster-tip cards-booster-tip-bottom" />
    </div>
  );
}
