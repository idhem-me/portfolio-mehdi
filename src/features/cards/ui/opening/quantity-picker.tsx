"use client";
import { MAX_OPENING_BOOSTERS } from "../../engine/quantity";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
export function QuantityPicker({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const valid =
    /^\d+$/.test(draft) &&
    Number.isSafeInteger(Number(draft)) &&
    Number(draft) >= 1 &&
    Number(draft) <= max;
  return (
    <>
      <div
        className="cards-quantity-picker"
        role="group"
        aria-label="Nombre de boosters à ouvrir"
      >
        <Button
          variant="secondary"
          size="icon"
          aria-label="Moins de boosters"
          disabled={disabled || value <= 1}
          onClick={() => onChange(value - 1)}
        >
          <Minus />
        </Button>
        <Button
          variant="secondary"
          aria-label={`Quantité : ${value}. Saisir une quantité`}
          disabled={disabled || max < 1}
          onClick={() => {
            setDraft(String(value));
            setOpen(true);
          }}
        >
          {value}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Plus de boosters"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus />
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="cards-quantity-sheet">
          <SheetHeader>
            <SheetTitle>Combien de boosters ?</SheetTitle>
            <SheetDescription>
              Limite : {MAX_OPENING_BOOSTERS} par ouverture. Tes gratuits et tes
              gems permettent d’en ouvrir {max}.
            </SheetDescription>
          </SheetHeader>
          <form
            className="space-y-4 px-4 pb-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) {
                onChange(Number(draft));
                setOpen(false);
              }
            }}
          >
            <label className="block text-sm" htmlFor="booster-quantity">
              Quantité à ouvrir
            </label>
            <Input
              id="booster-quantity"
              autoFocus
              inputMode="numeric"
              type="number"
              min={1}
              max={max}
              step={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={!valid}
            />
            <div className="flex flex-wrap gap-2">
              {[1, 5, 10, max]
                .filter((v, i, a) => v <= max && a.indexOf(v) === i)
                .map((n) => (
                  <Button
                    type="button"
                    variant="secondary"
                    key={n}
                    onClick={() => setDraft(String(n))}
                  >
                    {n === max ? `Tout (${n})` : n}
                  </Button>
                ))}
            </div>
            {!valid && (
              <p role="alert" className="text-sm text-destructive">
                Choisis un nombre entier entre 1 et {max}.
              </p>
            )}
            <Button type="submit" disabled={!valid} className="w-full">
              Valider
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
