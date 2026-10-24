/**
 * Chargement assets DA (`/game/asset-village/`).
 * Absents → placeholder canvas gris #9E9E9E + label noir.
 * Mipmaps activés sur les textures Pixi (LOD au dézoom).
 */

import { Assets, Rectangle, Texture } from "pixi.js";
import {
  ASSET_VILLAGE_BASE,
  INTERSECTION_PX,
  ROAD_PX,
  TILE_PX,
  USE_BIOME_ROAD_SPRITES,
  type BiomeId,
} from "@/game/core/mapConfig";
import { laneOriginX, laneOriginY } from "@/game/core/mapLanes";
import type { BuildingTypeId } from "@/game/core/types";

const PLACEHOLDER_GRAY = "#9E9E9E";
const PLACEHOLDER_TEXT = "#000000";

export type RoadOrientation = "H" | "V";

type TexEntry = {
  texture: Texture;
  /** Orientation native du PNG (routes). */
  orientation?: RoadOrientation;
  placeholder: boolean;
};

const cache = new Map<string, TexEntry>();
const missingLabels = new Set<string>();
let missingWarned = false;

function encodePath(path: string): string {
  return path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

function url(rel: string): string {
  return `${ASSET_VILLAGE_BASE}/${encodePath(rel)}`;
}

/** Fichiers réellement présents sous asset-village/. */
export const VILLAGE_FILES = {
  tiles: {
    herbe: "tuile/tuile-herbe.png",
    foret: "tuile/tuile-foret.png",
    eau: "tuile/tuile-eau.png",
  },
  routes: {
    herbe: "route/route-herbe.png",
    foret: "route/route-foret.png",
    eau: "route/route-eau.png",
    bitume: "route/route-bitume.png",
  },
  intersections: {
    herbe: "route/intersection-herbe.png",
    foret: "route/intersection-foret.png",
    eau: "route/intersection-eau.png",
    bitume: "route/intersection-bitume.png",
  },
  buildings: {
    townhall: "batiments/mairie1x1.png",
    townhall_2: "batiments/mairie1x1n2.png",
    /** Maisons : stades 1–4 (capacité 2/4/6/8). */
    house_1: "batiments/maison1x1(2p).png",
    house_2: "batiments/maison1x1(4p).png",
    house_3: "batiments/maison1x1(6p).png",
    house_4: "batiments/maison1x1(8p).png",
    /** Immeubles : stades 1–3 (capacité 6/12/18). */
    apartment_1: "batiments/immeuble1x1(6p).png",
    apartment_2: "batiments/immeuble1x1(12p).png",
    apartment_3: "batiments/immeuble1x1(18p).png",
    /** Charbon 2×1 fusionné (moitiés 1+2). */
    coal_plant: "batiments/central-charbon2x1-merged.png",
    shop: "batiments/commerce1x1.png",
    factory: "batiments/usine1x1.png",
    sawmill: "batiments/scierie1x1.png",
    quarry: "batiments/carriere1x1.png",
    school: "batiments/ecole1x1.png",
    solar_plant: "batiments/solaire-carport1x1.png",
    carpenter: "batiments/charpentier1x1.png",
    pharmacy: "batiments/pharmacie1x1.png",
    police: "batiments/police1x1.png",
    fire_station: "batiments/pompiers1x1.png",
    church: "batiments/eglise1x1.png",
    park: "batiments/parc1x1.png",
    tennis: "batiments/tennis1x1.png",
    skyscraper: "batiments/skyscrapper1x1.png",
    site_build: "batiments/chantier1x1.png",
    site_upgrade: "batiments/chantier1x1n2.png",
  },
} as const;

function makePlaceholder(label: string, w: number, h: number): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PLACEHOLDER_GRAY;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = PLACEHOLDER_TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontSize = Math.max(12, Math.min(48, Math.floor(Math.min(w, h) / 8)));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const lines = label.split(/[_/]/);
  const lineH = fontSize * 1.2;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineH, canvas.width - 8);
  });
  const tex = Texture.from(canvas);
  enableMipmaps(tex);
  return tex;
}

function enableMipmaps(tex: Texture): void {
  try {
    const src = tex.source;
    if (src && "autoGenerateMipmaps" in src) {
      (src as { autoGenerateMipmaps: boolean }).autoGenerateMipmaps = true;
    }
    if (src && "style" in src && src.style) {
      const style = src.style as { minFilter?: string; magFilter?: string };
      style.minFilter = "linear";
      style.magFilter = "linear";
    }
  } catch {
    /* ignore */
  }
}

async function loadOrPlaceholder(
  key: string,
  relPath: string | null,
  w: number,
  h: number
): Promise<TexEntry> {
  const cached = cache.get(key);
  if (cached) return cached;

  if (!relPath) {
    missingLabels.add(key);
    const entry: TexEntry = {
      texture: makePlaceholder(key, w, h),
      placeholder: true,
    };
    cache.set(key, entry);
    return entry;
  }

  try {
    const tex = await Assets.load<Texture>(url(relPath));
    enableMipmaps(tex);
    const ow = tex.width;
    const oh = tex.height;
    const orientation: RoadOrientation | undefined =
      key.startsWith("route-") || key.startsWith("route:")
        ? ow >= oh
          ? "H"
          : "V"
        : undefined;
    const entry: TexEntry = { texture: tex, orientation, placeholder: false };
    cache.set(key, entry);
    return entry;
  } catch {
    missingLabels.add(key);
    const entry: TexEntry = {
      texture: makePlaceholder(key, w, h),
      placeholder: true,
    };
    cache.set(key, entry);
    return entry;
  }
}

export async function loadVillageAssets(): Promise<void> {
  missingLabels.clear();
  missingWarned = false;

  const jobs: Promise<unknown>[] = [];

  for (const b of ["herbe", "foret", "eau"] as BiomeId[]) {
    jobs.push(
      loadOrPlaceholder(`tuile-${b}`, VILLAGE_FILES.tiles[b], TILE_PX, TILE_PX)
    );
    jobs.push(
      loadOrPlaceholder(
        `route-${b}`,
        VILLAGE_FILES.routes[b],
        TILE_PX,
        ROAD_PX
      )
    );
    jobs.push(
      loadOrPlaceholder(
        `intersection-${b}`,
        VILLAGE_FILES.intersections[b],
        INTERSECTION_PX,
        INTERSECTION_PX
      )
    );
  }
  jobs.push(
    loadOrPlaceholder(
      "route-bitume",
      VILLAGE_FILES.routes.bitume,
      TILE_PX,
      ROAD_PX
    )
  );
  jobs.push(
    loadOrPlaceholder(
      "intersection-bitume",
      VILLAGE_FILES.intersections.bitume,
      INTERSECTION_PX,
      INTERSECTION_PX
    )
  );

  // Bâtiments DA présents (runtime temporaire via asset-village/)
  const buildingLoads: [string, string, number, number][] = [
    ["bld-townhall", VILLAGE_FILES.buildings.townhall, TILE_PX, TILE_PX],
    ["bld-townhall-2", VILLAGE_FILES.buildings.townhall_2, TILE_PX, TILE_PX],
    ["bld-house-1", VILLAGE_FILES.buildings.house_1, TILE_PX, TILE_PX],
    ["bld-house-2", VILLAGE_FILES.buildings.house_2, TILE_PX, TILE_PX],
    ["bld-house-3", VILLAGE_FILES.buildings.house_3, TILE_PX, TILE_PX],
    ["bld-house-4", VILLAGE_FILES.buildings.house_4, TILE_PX, TILE_PX],
    ["bld-apartment-1", VILLAGE_FILES.buildings.apartment_1, TILE_PX, TILE_PX],
    ["bld-apartment-2", VILLAGE_FILES.buildings.apartment_2, TILE_PX, TILE_PX],
    ["bld-apartment-3", VILLAGE_FILES.buildings.apartment_3, TILE_PX, TILE_PX],
    ["bld-coal_plant", VILLAGE_FILES.buildings.coal_plant, TILE_PX * 2, TILE_PX],
    ["bld-shop", VILLAGE_FILES.buildings.shop, TILE_PX, TILE_PX],
    ["bld-factory", VILLAGE_FILES.buildings.factory, TILE_PX, TILE_PX],
    ["bld-sawmill", VILLAGE_FILES.buildings.sawmill, TILE_PX, TILE_PX],
    ["bld-quarry", VILLAGE_FILES.buildings.quarry, TILE_PX, TILE_PX],
    ["bld-school", VILLAGE_FILES.buildings.school, TILE_PX, TILE_PX],
    ["bld-solar_plant", VILLAGE_FILES.buildings.solar_plant, TILE_PX, TILE_PX],
    ["bld-carpenter", VILLAGE_FILES.buildings.carpenter, TILE_PX, TILE_PX],
    ["bld-pharmacy", VILLAGE_FILES.buildings.pharmacy, TILE_PX, TILE_PX],
    ["bld-police", VILLAGE_FILES.buildings.police, TILE_PX, TILE_PX],
    ["bld-fire_station", VILLAGE_FILES.buildings.fire_station, TILE_PX, TILE_PX],
    ["bld-church", VILLAGE_FILES.buildings.church, TILE_PX, TILE_PX],
    ["bld-park", VILLAGE_FILES.buildings.park, TILE_PX, TILE_PX],
    ["bld-tennis", VILLAGE_FILES.buildings.tennis, TILE_PX, TILE_PX],
    ["bld-skyscraper", VILLAGE_FILES.buildings.skyscraper, TILE_PX, TILE_PX],
    ["site-build", VILLAGE_FILES.buildings.site_build, TILE_PX, TILE_PX],
    ["site-upgrade", VILLAGE_FILES.buildings.site_upgrade, TILE_PX, TILE_PX],
  ];
  for (const [key, rel, w, h] of buildingLoads) {
    jobs.push(loadOrPlaceholder(key, rel, w, h));
  }

  // Placeholders pour le reste du catalogue (pas encore de DA)
  const missingBuildings: BuildingTypeId[] = [
    "market",
    "warehouse",
    "library",
    "fountain",
    "nuclear_plant",
    "monument",
  ];
  for (const id of missingBuildings) {
    jobs.push(loadOrPlaceholder(`bld-${id}`, null, TILE_PX, TILE_PX));
  }

  await Promise.all(jobs);
  const house1 = cache.get("bld-house-1");
  if (house1) cache.set("bld-house", house1);
  const apt1 = cache.get("bld-apartment-1");
  if (apt1) cache.set("bld-apartment", apt1);
  const th1 = cache.get("bld-townhall");
  if (th1) cache.set("bld-townhall-1", th1);
  flushMissingWarning();
}

function flushMissingWarning(): void {
  if (missingWarned || missingLabels.size === 0) return;
  missingWarned = true;
  console.warn(
    "[villageAssets] Assets manquants → placeholders :",
    [...missingLabels].sort()
  );
}

export function getTileTexture(biome: BiomeId): Texture {
  return cache.get(`tuile-${biome}`)?.texture ?? Texture.WHITE;
}

export function getRoadTexture(
  biomeOrBitume: BiomeId | "bitume"
): TexEntry {
  const key = `route-${biomeOrBitume}`;
  return (
    cache.get(key) ?? {
      texture: Texture.WHITE,
      orientation: "H" as RoadOrientation,
      placeholder: true,
    }
  );
}

export function getIntersectionTexture(
  biomeOrBitume: BiomeId | "bitume"
): Texture {
  return cache.get(`intersection-${biomeOrBitume}`)?.texture ?? Texture.WHITE;
}

const cropCache = new Map<string, Texture>();

/**
 * Portion de tuile biome (frame Pixi) — cache par biome×taille×offset.
 */
export function getTerrainCrop(
  biome: BiomeId,
  w: number,
  h: number,
  ox: number,
  oy: number
): Texture {
  if (biome === "eau") {
    return getTileTexture("eau");
  }
  const tw = Math.max(1, Math.round(w));
  const th = Math.max(1, Math.round(h));
  const sox = Math.max(0, Math.floor(ox));
  const soy = Math.max(0, Math.floor(oy));
  const key = `crop:${biome}:${tw}x${th}:${sox}:${soy}`;
  const hit = cropCache.get(key);
  if (hit) return hit;

  const base = getTileTexture(biome);
  const bw = Math.max(1, base.width || TILE_PX);
  const bh = Math.max(1, base.height || TILE_PX);
  const fw = Math.min(tw, bw);
  const fh = Math.min(th, bh);
  const fx = Math.min(sox, Math.max(0, bw - fw));
  const fy = Math.min(soy, Math.max(0, bh - fh));
  try {
    const tex = new Texture({
      source: base.source,
      frame: new Rectangle(fx, fy, fw, fh),
    });
    cropCache.set(key, tex);
    return tex;
  } catch {
    cropCache.set(key, base);
    return base;
  }
}

/**
 * Texture route/intersection non bitumée selon config.
 */
export function getNaturalRoadVisual(
  biome: BiomeId,
  kind: "roadH" | "roadV" | "intersection",
  ix: number,
  iy: number
): { texture: Texture; useSpriteTransform: boolean; entry?: TexEntry } {
  if (biome === "eau" || USE_BIOME_ROAD_SPRITES) {
    if (kind === "intersection") {
      return {
        texture: getIntersectionTexture(biome),
        useSpriteTransform: false,
      };
    }
    const entry = getRoadTexture(biome);
    return { texture: entry.texture, useSpriteTransform: true, entry };
  }
  // Continuité : un crop fixe par biome×kind (pas par case — perf).
  // Portion centrale de la tuile, échelle 1:1 → pas de zoom bizarre.
  void ix;
  void iy;
  void laneOriginX;
  void laneOriginY;
  if (kind === "intersection") {
    const ox = Math.floor((TILE_PX - INTERSECTION_PX) / 2);
    const oy = ox;
    return {
      texture: getTerrainCrop(biome, INTERSECTION_PX, INTERSECTION_PX, ox, oy),
      useSpriteTransform: false,
    };
  }
  if (kind === "roadH") {
    const oy = Math.floor((TILE_PX - ROAD_PX) / 2);
    return {
      texture: getTerrainCrop(biome, TILE_PX, ROAD_PX, 0, oy),
      useSpriteTransform: false,
    };
  }
  const ox = Math.floor((TILE_PX - ROAD_PX) / 2);
  return {
    texture: getTerrainCrop(biome, ROAD_PX, TILE_PX, ox, 0),
    useSpriteTransform: false,
  };
}

export function getSiteTexture(
  kind: "build" | "upgrade"
): TexEntry | null {
  return cache.get(kind === "build" ? "site-build" : "site-upgrade") ?? null;
}

export function getBuildingTexture(
  type: BuildingTypeId,
  level = 1
): TexEntry | null {
  const lvl = Math.max(1, Math.floor(level));
  if (type === "house") {
    const capped = Math.min(lvl, 4);
    return (
      cache.get(`bld-house-${capped}`) ??
      cache.get("bld-house") ??
      null
    );
  }
  if (type === "apartment") {
    const capped = Math.min(lvl, 3);
    return (
      cache.get(`bld-apartment-${capped}`) ??
      cache.get("bld-apartment") ??
      null
    );
  }
  if (type === "townhall") {
    const capped = Math.min(lvl, 2);
    return (
      cache.get(`bld-townhall-${capped}`) ??
      cache.get("bld-townhall") ??
      null
    );
  }
  return cache.get(`bld-${type}`) ?? null;
}

/**
 * Applique largeur/hauteur monde + rotation 90° si l'asset route
 * n'est pas dans l'orientation demandée.
 */
export function applyRoadSpriteTransform(
  spr: { width: number; height: number; rotation: number; anchor: { set: (x: number, y: number) => void }; x: number; y: number },
  entry: TexEntry,
  target: RoadOrientation,
  worldX: number,
  worldY: number,
  worldW: number,
  worldH: number
): void {
  const native = entry.orientation ?? "H";
  spr.anchor.set(0.5, 0.5);
  spr.x = worldX + worldW / 2;
  spr.y = worldY + worldH / 2;
  if (native === target) {
    spr.rotation = 0;
    spr.width = worldW;
    spr.height = worldH;
  } else {
    // PNG perpendiculaire → rotation 90° ; width/height swapés avant rot
    spr.rotation = Math.PI / 2;
    spr.width = worldH;
    spr.height = worldW;
  }
}
