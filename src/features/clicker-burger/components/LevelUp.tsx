import Image from "next/image";
import { BURGER_ASSETS } from "../assets/game-assets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function LevelUp({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}) {
  const asset = BURGER_ASSETS.levels[level - 1];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="text-center">
        <DialogTitle className="text-2xl font-medium tracking-tight">
          Niveau {level} !
        </DialogTitle>
        <Image
          width={180}
          height={180}
          src={asset.image}
          alt={asset.name}
          className="mx-auto my-5"
        />
        <p className="font-medium">Félicitations !</p>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          {asset.name} débloqué.
          <br />
          Multiplicateur ×{asset.multiplier}.
        </DialogDescription>
        <Button variant="accent" className="mt-6 w-full" onClick={onClose}>
          Continuer
        </Button>
      </DialogContent>
    </Dialog>
  );
}
