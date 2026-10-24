"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "pixi.js";
import { getBuildingDef } from "@/game/core/buildings";
import { parcelId } from "@/game/core/balance";
import { LANE_COUNT_X, LANE_COUNT_Y } from "@/game/core/mapLanes";
import {
  canPlaceFootprint,
  fineFootprintDims,
  isAdjacentParcel,
  parcelOfBlock,
} from "@/game/core/grid";
import { screenToTile } from "@/game/render/iso";
import { BuildingView } from "@/game/render/BuildingView";
import { Camera } from "@/game/render/Camera";
import { bindCamera } from "@/game/render/cameraBridge";
import { createPixiApp } from "@/game/render/createPixiApp";
import { IsoMap } from "@/game/render/IsoMap";
import { Scenery } from "@/game/render/Scenery";
import { gameStore, useGameStore } from "@/game/store/gameStore";
import { Link } from "@/i18n/navigation";
import { BuildMenu } from "./BuildMenu";
import { BuildingPanel } from "./BuildingPanel";
import {
  BulldozeConfirm,
  type BulldozeTarget,
} from "./BulldozeConfirm";
import { CameraControls } from "./CameraControls";
import { DebugBar } from "./DebugBar";
import { buildHighlightCells, tooltipForHover } from "./gameFeedback";
import { GameTooltip } from "./GameTooltip";
import { Hud } from "./Hud";
import { Toasts } from "./Toasts";
import { UnlockOverlay } from "./UnlockOverlay";
import { VillageLoader } from "./VillageLoader";
import type { GameState } from "@/game/core/types";
import { UNLOCK_FADE_MS } from "@/game/core/mapConfig";
import { canUnpaveCell, roadStrokePath } from "@/game/core/roads";
import type { RoadDir } from "@/game/core/types";

type PointerRec = {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
};

type RoadStroke = {
  lastX: number;
  lastY: number;
  pavedCount: number;
  goldSpent: number;
  /** Axe verrouillé du trait. */
  axis: RoadDir | null;
  /**
   * Cases déjà bitumées au début du trait (clés "x,y").
   * Virage autorisé seulement depuis celles-ci → intersection superposée.
   */
  pavedAtStart: Set<string>;
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
  const [tooltip, setTooltip] = useState<{
    text: string | null;
    x: number;
    y: number;
  }>({ text: null, x: 0, y: 0 });
  const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);
  const [fadingUnlock, setFadingUnlock] = useState<string | null>(null);
  const [pendingBulldoze, setPendingBulldoze] =
    useState<BulldozeTarget | null>(null);
  const bulldozeMode = useGameStore((s) => s.bulldozeMode);
  const [hoverUnlockId, setHoverUnlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!bulldozeMode) setPendingBulldoze(null);
  }, [bulldozeMode]);
  const [viewport, setViewport] = useState({ w: 800, h: 600 });
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
      const moving = s.movingBuildingId
        ? s.buildings.find((b) => b.id === s.movingBuildingId)
        : null;
      const placeType = s.placingType;
      const ghostType = moving?.type ?? placeType;
      if (!ghostType || !ghostTile.current) {
        bview.setGhost(0, 0, 1, 1, false, false);
        return;
      }
      const def = getBuildingDef(ghostType);
      const rot = moving
        ? (moving.rotation ?? "H")
        : (s.placingRotation ?? "H");
      const { x, y } = ghostTile.current;
      const valid = canPlaceFootprint(
        s.cells,
        s.unlockedParcels,
        x,
        y,
        def.width,
        def.height,
        rot,
        moving?.id ?? null
      );
      const { w, h } = fineFootprintDims(def.width, def.height, rot);
      bview.setGhost(x, y, w, h, valid, true, ghostType, rot);
    };

    const updateHighlights = (s: GameState = gameStore.getState()) => {
      if (!isoMap) return;
      const { key, cells } = buildHighlightCells(
        s,
        ghostTile.current,
        mapView(),
        gameStore.getState().coverageNeed
      );
      isoMap.setHighlights(key, cells, mapView());
    };

    const mapView = () => camera?.viewBounds();

    const sync = () => {
      const s = gameStore.getState();
      isoMap?.forceRebuild(s, hoverParcel.current, mapView());
      bview?.sync(s, s.now);
      updateGhost(s);
      updateHighlights(s);
    };

    const recullMap = () => {
      const s = gameStore.getState();
      isoMap?.sync(s, hoverParcel.current, mapView());
      updateHighlights(s);
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
        const canvasEl = a.canvas;
        canvasEl.style.touchAction = "none";
        canvasEl.style.display = "block";
        canvasEl.style.position = "absolute";
        canvasEl.style.inset = "0";
        canvasEl.style.width = "100%";
        canvasEl.style.height = "100%";
        // Stretch CSS OK : clientToWorld / clientToScreen corrige le mapping clic.

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
          setViewport({ w, h });
          if (!cam.hasUserMoved) cam.fitStartZone();
        });
        ro.observe(host);
        setViewport({
          w: host.clientWidth || 800,
          h: host.clientHeight || 600,
        });

        const canvas = a.canvas;
        const isCoarse = () =>
          window.matchMedia("(pointer: coarse)").matches;

        let roadStroke: RoadStroke | null = null;

        const paintRoadAt = (
          tx: number,
          ty: number,
          preferDir: RoadDir | null = null
        ) => {
          if (!roadStroke) return;
          if (
            tx < 0 ||
            ty < 0 ||
            tx >= LANE_COUNT_X ||
            ty >= LANE_COUNT_Y
          ) {
            return;
          }
          if (tx === roadStroke.lastX && ty === roadStroke.lastY) return;
          const res = gameStore.getState().paveAt(tx, ty, {
            quiet: true,
            preferDir,
          });
          roadStroke.lastX = tx;
          roadStroke.lastY = ty;
          if (res.ok && res.spent > 0) {
            roadStroke.pavedCount += 1;
            roadStroke.goldSpent += res.spent;
          }
          ghostTile.current = { x: tx, y: ty };
          updateHighlights();
        };

        const paintRoadLine = (tx: number, ty: number) => {
          if (!roadStroke) return;
          const fromX = roadStroke.lastX;
          const fromY = roadStroke.lastY;
          if (fromX < 0 || fromY < 0) {
            paintRoadAt(tx, ty, null);
            return;
          }
          const cells = gameStore.getState().cells;
          const canTurn = roadStroke.pavedAtStart.has(`${fromX},${fromY}`);
          const { path, axis } = roadStrokePath(
            cells,
            fromX,
            fromY,
            tx,
            ty,
            roadStroke.axis,
            { canTurn }
          );
          roadStroke.axis = axis;
          for (const p of path) {
            if (p.x === fromX && p.y === fromY) continue;
            paintRoadAt(p.x, p.y, axis);
          }
        };

        const finishRoadStroke = () => {
          if (!roadStroke) return;
          const { pavedCount, goldSpent } = roadStroke;
          roadStroke = null;
          if (pavedCount > 0) {
            gameStore
              .getState()
              .showToast(`Route construite −${goldSpent}🪙`);
          }
        };

        const handleTap = (clientX: number, clientY: number) => {
          if (!camera) return;
          const worldPt = camera.clientToWorld(clientX, clientY, canvas);
          const tile = screenToTile(worldPt.x, worldPt.y);
          const s = gameStore.getState();
          const now = Date.now();

          if (s.placingType || s.movingBuildingId) {
            ghostTile.current = tile;
            updateGhost(s);
            if (isCoarse()) {
              setMobileConfirm({ x: tile.x, y: tile.y });
            } else if (s.movingBuildingId) {
              gameStore.getState().confirmMove(tile.x, tile.y);
              ghostTile.current = null;
              updateGhost();
            } else {
              gameStore.getState().confirmPlace(tile.x, tile.y, now);
              ghostTile.current = null;
              updateGhost();
            }
            return;
          }

          // Bulldozer : sélection → confirmation (ne pas appeler select, ça quitte le mode)
          if (s.bulldozeMode) {
            const hitId = bview?.hitTest(worldPt.x, worldPt.y, s) ?? null;
            if (hitId) {
              const b = s.buildings.find((x) => x.id === hitId);
              if (b?.type === "townhall") {
                gameStore
                  .getState()
                  .showToast("La mairie ne peut pas être démolie.");
                return;
              }
              setPendingBulldoze({ kind: "building", id: hitId });
              return;
            }
            const inMap =
              tile.x >= 0 &&
              tile.y >= 0 &&
              tile.x < LANE_COUNT_X &&
              tile.y < LANE_COUNT_Y;
            if (inMap && canUnpaveCell(s.cells, tile.x, tile.y)) {
              setPendingBulldoze({
                kind: "road",
                x: tile.x,
                y: tile.y,
              });
              return;
            }
            const cell = inMap
              ? s.cells[tile.y * LANE_COUNT_X + tile.x]
              : null;
            if (cell?.paved && cell.permanent) {
              gameStore
                .getState()
                .showToast("Route d'entrée indémolissable.");
              return;
            }
            gameStore.getState().showToast("Rien à démolir ici.");
            return;
          }

          // Routes : uniquement via l'outil Route (tracé au glisser / pointerdown).

          // Clic sur le sprite opaque (devant → derrière), pas seulement la tuile sol
          const hitId = bview?.hitTest(worldPt.x, worldPt.y, s) ?? null;
          if (hitId) {
            gameStore.getState().select(hitId);
            return;
          }

          if (
            tile.x < 0 ||
            tile.y < 0 ||
            tile.x >= LANE_COUNT_X ||
            tile.y >= LANE_COUNT_Y
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
              hoverParcel.current = pid;
              setHoverUnlockId(pid);
              setPendingUnlock(pid);
              isoMap?.forceRebuild(s, pid, mapView());
              return;
            }
          }

          gameStore.getState().select(null);
          hoverParcel.current = null;
          setHoverUnlockId(null);
          setPendingUnlock(null);
          isoMap?.forceRebuild(s, null, mapView());
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
            finishRoadStroke();
            return;
          }
          if (camera && gameStore.getState().placingRoad && pointers.size === 1) {
            const worldPt = camera.clientToWorld(e.clientX, e.clientY, canvas);
            const tile = screenToTile(worldPt.x, worldPt.y);
            {
              const pavedAtStart = new Set<string>();
              const cells = gameStore.getState().cells;
              for (let y = 0; y < LANE_COUNT_Y; y++) {
                for (let x = 0; x < LANE_COUNT_X; x++) {
                  if (cells[y * LANE_COUNT_X + x]?.paved) {
                    pavedAtStart.add(`${x},${y}`);
                  }
                }
              }
              roadStroke = {
                lastX: -1,
                lastY: -1,
                pavedCount: 0,
                goldSpent: 0,
                axis: null,
                pavedAtStart,
              };
            }
            paintRoadAt(tile.x, tile.y, null);
          }
        };

        const onPointerMove = (e: PointerEvent) => {
          const rec = pointers.get(e.pointerId);
          if (!rec) {
            if (!camera) return;
            const rect = canvas.getBoundingClientRect();
            const worldPt = camera.clientToWorld(e.clientX, e.clientY, canvas);
            const tile = screenToTile(worldPt.x, worldPt.y);
            {
              const gs = gameStore.getState();
              if (
                (gs.placingType ||
                  gs.movingBuildingId ||
                  gs.placingRoad ||
                  gs.bulldozeMode) &&
                pointers.size === 0
              ) {
                ghostTile.current = tile;
                updateGhost();
                updateHighlights();
              }
            }
            const s = gameStore.getState();
            const hitId = bview?.hitTest(worldPt.x, worldPt.y, s) ?? null;
            const tip = tooltipForHover(s, tile, hitId);
            setTooltip({
              text: tip,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
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
            setHoverUnlockId(nextHover);
            if (nextHover !== hoverParcel.current) {
              hoverParcel.current = nextHover;
              isoMap?.forceRebuild(s, nextHover, mapView());
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
              recullMap();
            }
            return;
          }

          // Outil route : glisser = peindre, pas pan caméra
          if (roadStroke && camera) {
            const worldPt = camera.clientToWorld(e.clientX, e.clientY, canvas);
            const tile = screenToTile(worldPt.x, worldPt.y);
            paintRoadLine(tile.x, tile.y);
            return;
          }

          if (
            camera &&
            Math.hypot(e.clientX - rec.startX, e.clientY - rec.startY) > 8
          ) {
            camera.pan(dx, dy);
            recullMap();
          }
        };

        const onPointerUp = (e: PointerEvent) => {
          const rec = pointers.get(e.pointerId);
          pointers.delete(e.pointerId);
          if (!rec) return;
          if (roadStroke) {
            finishRoadStroke();
            return;
          }
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
          const factor = e.deltaY > 0 ? 0.9 : 1.1;
          const scr = camera.clientToScreen(e.clientX, e.clientY, canvas);
          camera.setZoom(camera.zoom * factor, scr.x, scr.y);
          camera.markUserMoved();
          recullMap();
        };

        const onContext = (e: Event) => e.preventDefault();
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            setPendingBulldoze(null);
            gameStore.getState().cancelPlace();
            gameStore.getState().cancelMoveMode();
            setMobileConfirm(null);
            ghostTile.current = null;
            hoverParcel.current = null;
            updateGhost();
          }
          if (e.key === "r" || e.key === "R") {
            if (gameStore.getState().placingType) {
              gameStore.getState().rotatePlace();
              updateGhost();
              updateHighlights();
            }
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
      {ready && (
        <UnlockOverlay
          hoverId={hoverUnlockId}
          pendingId={pendingUnlock}
          fadingId={fadingUnlock}
          onRequestUnlock={(id) => setPendingUnlock(id)}
          onConfirm={() => {
            const id = pendingUnlock;
            setPendingUnlock(null);
            setFadingUnlock(id);
            window.setTimeout(() => setFadingUnlock(null), UNLOCK_FADE_MS);
          }}
          onCancel={() => setPendingUnlock(null)}
        />
      )}
      <GameTooltip
        text={tooltip.text}
        x={tooltip.x}
        y={tooltip.y}
        containerW={viewport.w}
        containerH={viewport.h}
      />
      {/* Au-dessus des cadenas UnlockOverlay (z-5) */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <Hud />
        <CameraControls />
        <BuildMenu />
        <BuildingPanel />
        <Toasts />
        {debug && <DebugBar />}
        {pendingBulldoze && (
          <BulldozeConfirm
            target={pendingBulldoze}
            onConfirm={() => {
              const t = pendingBulldoze;
              setPendingBulldoze(null);
              if (t.kind === "building") {
                gameStore.getState().demolish(t.id);
              } else {
                gameStore.getState().unpaveAt(t.x, t.y);
              }
            }}
            onCancel={() => setPendingBulldoze(null)}
          />
        )}
        {mobileConfirm && (
          <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] flex justify-center gap-3 px-4 md:hidden">
            <button
              type="button"
              className="min-h-11 rounded-md bg-stone-800 px-5 text-sm font-medium text-white"
              onClick={() => {
                const gs = gameStore.getState();
                if (gs.movingBuildingId) {
                  gs.confirmMove(mobileConfirm.x, mobileConfirm.y);
                } else {
                  gs.confirmPlace(
                    mobileConfirm.x,
                    mobileConfirm.y,
                    Date.now()
                  );
                }
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
                gameStore.getState().cancelMoveMode();
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
