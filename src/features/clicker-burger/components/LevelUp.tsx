import Image from "next/image";
import { BURGER_ASSETS } from "../assets/game-assets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const LEVEL_BLURBS: Record<number, string> = {
  1: "Une table, une friteuse, une ambition disproportionnée.",
  2: "Le stand ouvre. Le quartier commence à avoir faim.",
  3: "Une vraie adresse. Les clients ont désormais un alibi.",
  4: "La logistique suit enfin la sauce.",
  5: "Le monde découvre votre menu. Ou l’inverse.",
  6: "Mars commande. Le ticket moyen est astronomique.",
  7: "Le système solaire a une nouvelle chaîne préférée.",
  8: "Ouvert et fermé, jusqu’à la première commande.",
  9: "Les galaxies voisines ont faim aussi.",
  10: "Vous avez nourri l’univers. Les actionnaires applaudissent. Les cosmologues, moins.",
};

export function LevelUp({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}) {
  const asset = BURGER_ASSETS.levels[level - 1];
  const finale = level >= 10;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="text-center">
        <DialogTitle className="text-2xl font-medium tracking-tight">
          {finale ? "Univers conquis" : `Niveau ${level} !`}
        </DialogTitle>
        <Image
          width={180}
          height={180}
          src={asset.image}
          alt={asset.name}
          className="mx-auto my-5"
        />
        <p className="font-medium">
          {finale ? "Fin de partie… ou presque." : "Félicitations !"}
        </p>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          {finale ? (
            <>
              {LEVEL_BLURBS[10]}
              <br />
              <br />
              Bonus de niveau ×{asset.multiplier} sur la production et les
              clics. La production continue ; le prestige reste disponible si
              vous voulez recommencer plus fort.
            </>
          ) : (
            <>
              {asset.name} débloqué.
              <br />
              {LEVEL_BLURBS[level] ?? `${asset.name}.`}
              <br />
              Bonus de niveau ×{asset.multiplier} sur la production et les
              clics.
            </>
          )}
        </DialogDescription>
        <Button variant="accent" className="mt-6 w-full" onClick={onClose}>
          {finale ? "Continuer l’empire" : "Continuer"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
