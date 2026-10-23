"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cameraRecenter,
  cameraZoomIn,
  cameraZoomOut,
} from "@/game/render/cameraBridge";

export function CameraControls() {
  return (
    <div
      className="pointer-events-auto absolute z-20 flex flex-col gap-2"
      style={{
        right: "max(0.75rem, env(safe-area-inset-right))",
        bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
      }}
      role="group"
      aria-label="Contrôles de la caméra"
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="min-h-11 min-w-11 bg-white/90 shadow-sm dark:bg-stone-900/85"
        aria-label="Zoom avant"
        onClick={() => cameraZoomIn()}
      >
        <Plus className="size-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="min-h-11 min-w-11 bg-white/90 shadow-sm dark:bg-stone-900/85"
        aria-label="Zoom arrière"
        onClick={() => cameraZoomOut()}
      >
        <Minus className="size-5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="min-h-11 min-w-11 bg-white/90 shadow-sm dark:bg-stone-900/85"
        aria-label="Recentrer la carte"
        onClick={() => cameraRecenter()}
      >
        <LocateFixed className="size-5" />
      </Button>
    </div>
  );
}
