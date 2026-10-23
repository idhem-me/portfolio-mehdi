"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "pixi.js";
import { getBuildingDef } from "@/game/core/buildings";
import { MAP_SIZE, parcelId } from "@/game/core/balance";
import { canPlaceFootprint, parcelOfBlock } from "@/game/core/grid";
import { isAdjacentParcel } from "@/game/core/grid";
import { screenToTile } from "@/game/render/iso";
import { BuildingView } from "@/game/render/BuildingView";
import { Camera } from "@/game/render/Camera";
import { bindCamera } from "@/game/render/cameraBridge";
import { createPixiApp } from "@/game/render/createPixiApp";
import { IsoMap } from "@/game/render/IsoMap";
import { Scenery } from "@/game/render/Scenery";
import { gameStore } from "@/game/store/gameStore";
import { Link } from "@/i18n/navigation";
import { BuildMenu } from "./BuildMenu";
import { BuildingPanel } from "./BuildingPanel";
import { CameraControls } from "./CameraControls";
import { DebugBar } from "./DebugBar";
import { Hud } from "./Hud";
import { Toasts } from "./Toasts";
import { VillageLoader } from "./VillageLoader";
import type { GameState } from "@/game/core/types";

type PointerRec = {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
};

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function GameInner() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [mobileConfirm, setMobileConfirm] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const searchParams = useSearchParams();
  const debug =
    process.env.NODE_ENV !== "production" &&
    searchParams.get("debug") === "1";

  const ghostTile = useRef<{ x: number; y: number } | null>(null);
  const hoverParcel = useRef<string | null>(null);

  useEffect(() => {
    if (!debug) return;
    const speed = Number(searchParams.get("speed") ?? "1");
    if (Number.isFinite(speed) && speed > 0) {
      gameStore.getState().setSpeed(speed);
    }
  }, [debug, searchParams]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let app: Awaited<ReturnType<typeof createPixiApp>> | null = null;
    let unsub: (() => void) | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let ro: ResizeObserver | null = null;
    const pointers = new Map<number, PointerRec>();
    let pinchStartDist = 0;
    let pinchStartZoom = 1;
    let camera: Camera | null = null;
    let bview: BuildingView | null = null;
    let isoMap: IsoMap | null = null;
    let scenery: Scenery | null = null;

    const updateGhost = (s: GameState = gameStore.getState()) => {
      if (!bview) return;
      if (!s.placingType || !ghostTile.current) {
        bview.setGhost(0, 0, 1, 1, false, false);
        return;
      }
      const def = getBuildingDef(s.placingType);
      const { x, y } = ghostTile.current;
      const valid = canPlaceFootprint(
        s.cells,
        s.unlockedParcels,
        x,
        y,
        def.width,
        def.height
      );
      bview.setGhost(x, y, def.width, def.height, valid, true);
    };

    const sync = () => {
      const s = gameStore.getState();
      isoMap?.forceRebuild(s, hoverParcel.current);
      bview?.sync(s, s.now);
      updateGhost(s);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        gameStore.getState().doTick(Date.now());
      }
    };

    (async () => {
      try {
        const a = await createPixiApp({
          width: host.clientWidth || 800,
          height: host.clientHeight || 600,
        });
        if (cancelled) {
          a.destroy(true, { children: true, texture: true });
          return;
        }
        app = a;
        host.appendChild(a.canvas);
        a.canvas.style.touchAction = "none";
        a.canvas.style.display = "block";
        a.canvas.style.width = "100%";
        a.canvas.style.height = "100%";

        const world = new Container();
        a.stage.addChild(world);
        camera = new Camera(world);
        camera.setViewSize(a.screen.width, a.screen.height);
        bindCamera(camera);

        scenery = new Scenery();
        await scenery.loadAssets();
        if (cancelled) {
          a.destroy(true, { children: true, texture: true });
          return;
        }
        scenery.build();
        world.addChild(scenery.root);

        isoMap = new IsoMap();
        await isoMap.bake(a.renderer);
        if (cancelled) {
          a.destroy(true, { children: true, texture: true });
          return;
        }
        world.addChild(isoMap.ground);
        world.addChild(isoMap.props);

        bview = new BuildingView();
        isoMap.props.addChild(bview.layer);
        await bview.loadAssets();
        if (cancelled) {
          a.destroy(true, { children: true, texture: true });
          return;
        }

        sync();
        camera.fitStartZone();
        unsub = gameStore.subscribe(sync);

        tickTimer = setInterval(() => {
          gameStore.getState().doTick(Date.now());
        }, 250);

        document.addEventListener("visibilitychange", onVisibility);

        const cam = camera;
        ro = new ResizeObserver(() => {
          if (!app || !host) return;
          const w = host.clientWidth;
          const h = host.clientHeight;
          app.renderer.resize(w, h);
          cam.setViewSize(w, h);
          if (!cam.hasUserMoved) cam.fitStartZone();
        });
        ro.observe(host);

        const canvas = a.canvas;
        const isCoarse = () =>
          window.matchMedia("(pointer: coarse)").matches;

        const handleTap = (clientX: number, clientY: number) => {
          if (!camera) return;
          const rect = canvas.getBoundingClientRect();
          const worldPt = camera.screenToWorld(
            clientX - rect.left,
            clientY - rect.top
          );
          const tile = screenToTile(worldPt.x, worldPt.y);
          const s = gameStore.getState();
          const now = Date.now();

          if (s.placingType) {
            ghostTile.current = tile;
            updateGhost(s);
            if (isCoarse()) {
              setMobileConfirm({ x: tile.x, y: tile.y });
            } else {
              gameStore.getState().confirmPlace(tile.x, tile.y, now);
              ghostTile.current = null;
              updateGhost();
            }
            return;
          }

          // Clic sur le sprite opaque (devant → derrière), pas seulement la tuile sol
          const hitId = bview?.hitTest(worldPt.x, worldPt.y, s) ?? null;
          if (hitId) {
            gameStore.getState().select(hitId);
            return;
          }

          if (
            tile.x < 0 ||
            tile.y < 0 ||
            tile.x >= MAP_SIZE ||
            tile.y >= MAP_SIZE
          ) {
            gameStore.getState().select(null);
            return;
          }

          const pid = parcelOfBlock(tile.x, tile.y);
          if (pid) {
            const [px, py] = pid.split(",").map(Number) as [number, number];
            if (
              !s.unlockedParcels.includes(pid) &&
              isAdjacentParcel(s.unlockedParcels, px, py)
            ) {
              // Confirmation : second tap / clic achète
              if (hoverParcel.current === pid) {
                gameStore.getState().purchaseParcel(px, py);
                hoverParcel.current = null;
              } else {
                hoverParcel.current = pid;
                isoMap?.forceRebuild(s, pid);
              }
              return;
            }
          }

          gameStore.getState().select(null);
          hoverParcel.current = null;
          isoMap?.forceRebuild(s, null);
        };

        const onPointerDown = (e: PointerEvent) => {
          canvas.setPointerCapture(e.pointerId);
          pointers.set(e.pointerId, {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            startX: e.clientX,
            startY: e.clientY,
            startTime: performance.now(),
          });
          if (pointers.size === 2) {
            const pts = [...pointers.values()];
            pinchStartDist = dist(pts[0]!, pts[1]!);
            pinchStartZoom = camera?.zoom ?? 1;
          }
        };

        const onPointerMove = (e: PointerEvent) => {
          const rec = pointers.get(e.pointerId);
          if (!rec) {
            if (!camera) return;
            const rect = canvas.getBoundingClientRect();
            const worldPt = camera.screenToWorld(
              e.clientX - rect.left,
              e.clientY - rect.top
            );
            const tile = screenToTile(worldPt.x, worldPt.y);
            if (gameStore.getState().placingType && pointers.size === 0) {
              ghostTile.current = tile;
              updateGhost();
            }
            const s = gameStore.getState();
            const pid = parcelOfBlock(tile.x, tile.y);
            let nextHover: string | null = null;
            if (pid) {
              const [px, py] = pid.split(",").map(Number) as [
                number,
                number,
              ];
              if (
                !s.unlockedParcels.includes(pid) &&
                isAdjacentParcel(s.unlockedParcels, px, py)
              ) {
                nextHover = pid;
              }
            }
            if (nextHover !== hoverParcel.current) {
              hoverParcel.current = nextHover;
              isoMap?.forceRebuild(s, nextHover);
            }
            return;
          }
          const dx = e.clientX - rec.x;
          const dy = e.clientY - rec.y;
          rec.x = e.clientX;
          rec.y = e.clientY;

          if (pointers.size === 2 && camera) {
            const pts = [...pointers.values()];
            const d = dist(pts[0]!, pts[1]!);
            if (pinchStartDist > 0) {
              const rect = canvas.getBoundingClientRect();
              const mx = (pts[0]!.x + pts[1]!.x) / 2 - rect.left;
              const my = (pts[0]!.y + pts[1]!.y) / 2 - rect.top;
              camera.setZoom(pinchStartZoom * (d / pinchStartDist), mx, my);
              camera.markUserMoved();
            }
            return;
          }

          if (
            camera &&
            Math.hypot(e.clientX - rec.startX, e.clientY - rec.startY) > 8
          ) {
            camera.pan(dx, dy);
          }
        };

        const onPointerUp = (e: PointerEvent) => {
          const rec = pointers.get(e.pointerId);
          pointers.delete(e.pointerId);
          if (!rec) return;
          const moved = Math.hypot(
            e.clientX - rec.startX,
            e.clientY - rec.startY
          );
          const dt = performance.now() - rec.startTime;
          if (moved < 8 && dt < 300 && pointers.size === 0) {
            handleTap(e.clientX, e.clientY);
          }
        };

        const onWheel = (e: WheelEvent) => {
          if (!camera) return;
          e.preventDefault();
          const rect = canvas.getBoundingClientRect();
          const factor = e.deltaY > 0 ? 0.9 : 1.1;
          camera.setZoom(
            camera.zoom * factor,
            e.clientX - rect.left,
            e.clientY - rect.top
          );
          camera.markUserMoved();
        };

        const onContext = (e: Event) => e.preventDefault();
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            gameStore.getState().cancelPlace();
            setMobileConfirm(null);
            ghostTile.current = null;
            hoverParcel.current = null;
            updateGhost();
          }
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("wheel", onWheel, { passive: false });
        canvas.addEventListener("contextmenu", onContext);
        window.addEventListener("keydown", onKey);

        (a as unknown as { __cleanup?: () => void }).__cleanup = () => {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerUp);
          canvas.removeEventListener("wheel", onWheel);
          canvas.removeEventListener("contextmenu", onContext);
          window.removeEventListener("keydown", onKey);
        };

        setReady(true);
        void parcelId;
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      bindCamera(null);
      document.removeEventListener("visibilitychange", onVisibility);
      if (tickTimer) clearInterval(tickTimer);
      unsub?.();
      ro?.disconnect();
      if (app) {
        (app as unknown as { __cleanup?: () => void }).__cleanup?.();
        app.destroy(true, { children: true, texture: true });
      }
      while (host.firstChild) host.removeChild(host.firstChild);
    };
  }, []);

  if (error) {
    return (
      <div
        className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
        style={{
          background: "linear-gradient(180deg, #5eb8d4 0%, #2a8aaa 100%)",
        }}
      >
        <p className="text-stone-800">
          Impossible d&apos;initialiser le rendu (WebGL).
        </p>
        <Link
          href="/"
          className="rounded-md bg-stone-800 px-4 py-2 text-sm text-white"
        >
          ← Portfolio
        </Link>
      </div>
    );
  }

  return (
    <div
      dir="ltr"
      lang="fr"
      className="relative h-dvh w-full overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #5eb8d4 0%, #2a8aaa 100%)",
        touchAction: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        overscrollBehavior: "none",
      }}
    >
      <div ref={hostRef} className="absolute inset-0" />
      {!ready && <VillageLoader />}
      <div className="pointer-events-none absolute inset-0 z-10">
        <Hud />
        <CameraControls />
        <BuildMenu />
        <BuildingPanel />
        <Toasts />
        {debug && <DebugBar />}
        {mobileConfirm && (
          <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex justify-center gap-3 px-4 md:hidden">
            <button
              type="button"
              className="min-h-11 rounded-md bg-stone-800 px-5 text-sm font-medium text-white"
              onClick={() => {
                gameStore
                  .getState()
                  .confirmPlace(mobileConfirm.x, mobileConfirm.y, Date.now());
                setMobileConfirm(null);
                ghostTile.current = null;
              }}
            >
              Valider
            </button>
            <button
              type="button"
              className="min-h-11 rounded-md border border-stone-400 bg-white/90 px-5 text-sm font-medium text-stone-800"
              onClick={() => {
                gameStore.getState().cancelPlace();
                setMobileConfirm(null);
                ghostTile.current = null;
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Game() {
  return (
    <Suspense fallback={<VillageLoader />}>
      <GameInner />
    </Suspense>
  );
}
