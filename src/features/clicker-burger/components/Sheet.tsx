"use client";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet as PortfolioSheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
export function Sheet({
  title,
  children,
  onClose,
  stableHeight = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  stableHeight?: boolean;
}) {
  return (
    <PortfolioSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={`clicker-burger game-sheet-portal ${stableHeight ? "missions-sheet" : ""}`}
      >
        <div className="sheet-handle" />
        <SheetHeader className="sheet-header">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Actions de Clicker Burger
          </SheetDescription>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fermer le panneau">
              <X />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="sheet-body">{children}</div>
      </SheetContent>
    </PortfolioSheet>
  );
}
