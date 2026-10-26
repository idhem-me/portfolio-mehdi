import Image from "next/image";
import { useEffect, useRef } from "react";
import { BURGER_ASSETS } from "../assets/game-assets";
import { Button } from "@/components/ui/button";
export function LevelUp({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  const asset = BURGER_ASSETS.levels[level - 1];
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      close.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className="level-dialog" aria-labelledby="level-title">
      <h2 id="level-title">Niveau {level} !</h2>
      <Image width={180} height={180} src={asset.image} alt={asset.name} />
      <h3>Félicitations !</h3>
      <p>
        {asset.name} débloqué.
        <br />
        Multiplicateur de niveau ×{asset.multiplier}.
      </p>
      <Button variant="accent" onClick={onClose}>
        Continuer
      </Button>
    </dialog>
  );
}
