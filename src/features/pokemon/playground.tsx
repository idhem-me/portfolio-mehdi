"use client";

import Image from "next/image";
import { CircleHelp, Maximize, Minimize } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";
import type { PokemonEntry } from "./data";

type Point = { x: number; y: number };
const center: Point = { x: 0.5, y: 0.5 };
const arrows: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function PokemonSprite({
  name,
  sprite,
}: {
  name: string;
  sprite: string | null;
}) {
  const t = useTranslations("pokemon");
  const stage = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(center);
  const drag = useRef<{ id: number; offset: Point } | null>(null);

  function moveTo(x: number, y: number) {
    setPosition({ x: clamp(x), y: clamp(y) });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current) return;
    const sprite = event.currentTarget;
    const bounds = sprite.getBoundingClientRect();
    drag.current = {
      id: event.pointerId,
      offset: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
    };
    sprite.focus({ preventScroll: true });
    sprite.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId || !stage.current) return;
    const bounds = stage.current.getBoundingClientRect();
    const { offset } = drag.current;
    moveTo(
      (event.clientX - bounds.left - offset.x) /
        Math.max(1, bounds.width - event.currentTarget.offsetWidth),
      (event.clientY - bounds.top - offset.y) /
        Math.max(1, bounds.height - event.currentTarget.offsetHeight),
    );
  }

  function moveWithKey(event: KeyboardEvent<HTMLDivElement>) {
    const direction = arrows[event.key];
    if (!direction || !stage.current) return;
    event.preventDefault();
    moveTo(
      position.x +
        (12 * direction.x) /
          Math.max(
            1,
            stage.current.clientWidth - event.currentTarget.offsetWidth,
          ),
      position.y +
        (12 * direction.y) /
          Math.max(
            1,
            stage.current.clientHeight - event.currentTarget.offsetHeight,
          ),
    );
  }

  return (
    <div ref={stage} className="relative h-full w-full">
      <div
        role="group"
        aria-label={name}
        aria-describedby="pokemon-instructions"
        tabIndex={0}
        className="absolute grid size-24 max-h-full max-w-full touch-none cursor-grab select-none place-items-center rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:cursor-grabbing"
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          transform: `translate(${position.x * -100}%, ${position.y * -100}%)`,
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onLostPointerCapture={(event) => {
          if (drag.current?.id === event.pointerId) drag.current = null;
        }}
        onKeyDown={moveWithKey}
      >
        {sprite ? (
          <Image
            src={`/pokemon/${sprite}`}
            alt=""
            width={96}
            height={96}
            unoptimized
            draggable={false}
            className="pointer-events-none size-full object-contain [image-rendering:pixelated]"
          />
        ) : (
          <CircleHelp
            aria-label={t("noSprite")}
            role="img"
            className="size-8 text-muted-foreground"
          />
        )}
      </div>
    </div>
  );
}

export function PokemonPlayground({
  pokemon,
  shiny,
}: {
  pokemon: PokemonEntry;
  shiny: boolean;
}) {
  const t = useTranslations("pokemon");
  const nav = useTranslations("nav");
  const dialog = useRef<HTMLDialogElement>(null);
  const [fullPage, setFullPage] = useState(false);
  const label = fullPage ? t("exitFullPage") : t("fullPage");

  function toggleFullPage() {
    const scene = dialog.current;
    if (!scene) return;
    scene.close();
    if (fullPage) scene.show();
    else scene.showModal();
    setFullPage(!fullPage);
    scene
      .querySelector<HTMLElement>("#pokemon-full-page")
      ?.focus({ preventScroll: true });
  }

  return (
    <dialog
      ref={dialog}
      open
      role={fullPage ? "dialog" : "presentation"}
      aria-label={fullPage ? t("stage") : undefined}
      aria-modal={fullPage || undefined}
      onCancel={(event) => {
        event.preventDefault();
        toggleFullPage();
      }}
      className="relative m-0 h-[calc(100dvh-max(1rem,env(safe-area-inset-top))-var(--control-height-icon)-1rem)] max-h-none w-full max-w-none overflow-hidden border-0 bg-background p-0 text-foreground md:h-dvh [&:modal]:fixed [&:modal]:inset-0 [&:modal]:h-dvh [&:modal]:overscroll-contain"
    >
      <section aria-label={t("stage")} className="relative h-full w-full">
        <p id="pokemon-instructions" className="sr-only">
          {t("instructions")}
        </p>
        <PokemonSprite
          name={pokemon.name}
          sprite={(shiny && pokemon.shiny) || pokemon.sprite}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {fullPage && <span className="size-(--control-height-icon) shrink-0" />}
          <div className="flex min-w-0 flex-col items-start gap-2">
            {!fullPage && (
              <PageBreadcrumb
                current={pokemon.name}
                parents={[
                  { href: "/jeux", label: nav("games") },
                  { href: "/jeux/pokemon", label: t("pokedex") },
                ]}
                className="pointer-events-auto rounded-xl border border-border bg-popover px-2 text-popover-foreground"
              />
            )}
            <h1 className="flex max-w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-lg">
              <bdi className="shrink-0 tabular-nums text-muted-foreground">
                #{String(pokemon.id).padStart(3, "0")}
              </bdi>
              <span className="truncate">{pokemon.name}</span>
            </h1>
          </div>
          <Button
            id="pokemon-full-page"
            type="button"
            variant="ghost"
            size="icon"
            className="pointer-events-auto shrink-0 bg-background"
            aria-label={label}
            title={label}
            onClick={toggleFullPage}
          >
            {fullPage ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
          </Button>
        </div>
      </section>
    </dialog>
  );
}
