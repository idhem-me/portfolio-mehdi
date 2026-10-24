import {
  ACTIVE_POP_RATIO,
  ATTRACT_LEISURE_BONUS,
  ATTRACT_MAX,
  ATTRACT_MIN,
  ATTRACT_POLLUTION_PENALTY,
  ATTRACTIVENESS_BY_NEED,
  CAPACITY_LVL_BONUS,
  POWER_TARGET_PENALTY,
  UNEMPLOYMENT_N1_MAX,
  UNEMPLOYMENT_TARGET_PENALTY,
} from "./balance";
import { getBuildingDef } from "./buildings";
import {
  computeCoverage,
  type CoverageSnapshot,
  type HousingNeedInfo,
} from "./coverage";
import type { BuildingDef, GameState, PlacedBuilding } from "./types";

export type NeedLevel = 0 | 1 | 2 | 3;

export type CitySnapshot = {
  powerSupply: number;
  powerDemand: number;
  powerRatio: number;
  jobs: number;
  activeWorkers: number;
  unemployment: number;
  staffingRatio: number;
  housing: number;
  population: number;
  coverage: {
    commerce: number;
    education: number;
    cultureLeisure: number;
    health: number;
    safety: number;
  };
  /** Besoin moyen (pondéré logement) — impôts / attractivité. */
  needLevel: NeedLevel;
  /** Répartition % des habitants par niveau N0–N3. */
  needDistributionPct: Record<NeedLevel, number>;
  housingNeeds: Map<string, HousingNeedInfo>;
  coverageDetail: CoverageSnapshot;
  attractiveness: number;
  targetPopulation: number;
  demandRCI: { R: number; C: number; I: number };
  pollution: number;
  leisurePoints: number;
  advice: string[];
};

/** Capacité à un niveau : base × (1 + 0.5 × (lvl − 1)). */
export function capacityAtLevel(base: number, level: number): number {
  if (level <= 0 || base === 0) return 0;
  return base * (1 + CAPACITY_LVL_BONUS * (level - 1));
}

/**
 * Logement d'un bâtiment : table `housingLevels` si présente,
 * sinon formule capacityAtLevel(def.housing, level).
 */
export function housingAtLevel(
  def: Pick<BuildingDef, "housing" | "housingLevels">,
  level: number
): number {
  if (level <= 0) return 0;
  const table = def.housingLevels;
  if (table && table.length > 0) {
    const idx = Math.min(Math.max(0, level - 1), table.length - 1);
    return table[idx] ?? 0;
  }
  return capacityAtLevel(def.housing, level);
}

export function isPowerPlant(type: PlacedBuilding["type"]): boolean {
  return getBuildingDef(type).category === "energy";
}

export function activeBuildings(state: GameState): PlacedBuilding[] {
  return state.buildings.filter((b) => !b.construction && b.level > 0);
}

/**
 * Efficiency d'un bâtiment : centrales = staffing seul ;
 * sinon powerRatio × staffingRatio, chacun borné [0, 1].
 */
export function buildingEfficiency(
  building: PlacedBuilding,
  city: Pick<CitySnapshot, "powerRatio" | "staffingRatio">
): number {
  if (building.construction || building.level <= 0) return 0;
  const staffing = clamp01(city.staffingRatio);
  if (isPowerPlant(building.type)) return staffing;
  return clamp01(city.powerRatio) * staffing;
}

export function efficiencyReason(
  building: PlacedBuilding,
  city: Pick<CitySnapshot, "powerRatio" | "staffingRatio">
): string | null {
  const eff = buildingEfficiency(building, city);
  if (eff >= 0.999) return null;
  if (isPowerPlant(building.type)) {
    return city.staffingRatio < 1 ? "Manque de personnel" : null;
  }
  const reasons: string[] = [];
  if (city.powerRatio < 1) reasons.push("Manque d'électricité");
  if (city.staffingRatio < 1) reasons.push("Manque de personnel");
  return reasons.join(" · ") || null;
}

/** Snapshot dérivé (non stocké) — toute la logique ville. */
export function computeCity(state: GameState, _now?: number): CitySnapshot {
  void _now;
  const pop = Math.max(0, state.population);
  const buildings = activeBuildings(state);

  let jobs = 0;
  let housing = 0;
  let pollution = 0;
  let leisurePoints = 0;
  let commerceCap = 0;
  let educationCap = 0;
  let cultureCap = 0;
  let leisureCap = 0;
  let healthCap = 0;
  let safetyCap = 0;
  let cultureMult = 1;
  let rawSupply = 0;
  let powerDemand = 0;

  for (const b of buildings) {
    const def = getBuildingDef(b.type);
    const lvl = b.level;
    jobs += capacityAtLevel(def.jobs, lvl);
    housing += housingAtLevel(def, lvl);
    pollution += def.pollution;
    if (def.cultureMultiplier && def.cultureMultiplier > 1) {
      cultureMult = Math.max(cultureMult, def.cultureMultiplier);
    }
    if (def.serves) {
      const cap = capacityAtLevel(def.serves.capacity, lvl);
      switch (def.serves.need) {
        case "commerce":
          commerceCap += cap;
          break;
        case "education":
          educationCap += cap;
          break;
        case "culture":
          cultureCap += cap;
          break;
        case "leisure":
          leisureCap += cap;
          break;
        case "health":
          healthCap += cap;
          break;
        case "safety":
          safetyCap += cap;
          break;
      }
    }
    if (def.pollution < 0) leisurePoints += -def.pollution;
    const powerScaled =
      def.power === 0
        ? 0
        : Math.sign(def.power) * capacityAtLevel(Math.abs(def.power), lvl);
    if (powerScaled > 0) rawSupply += powerScaled;
    else if (powerScaled < 0) powerDemand += -powerScaled;
  }

  cultureCap *= cultureMult;

  const activeWorkers = Math.floor(pop * ACTIVE_POP_RATIO);
  const staffingRatio =
    jobs <= 0 ? 1 : clamp01(activeWorkers / jobs);
  const unemployment =
    activeWorkers <= 0
      ? jobs > 0
        ? 1
        : 0
      : clamp01(Math.max(0, activeWorkers - jobs) / activeWorkers);

  const powerSupply = rawSupply * staffingRatio;
  const powerRatio =
    powerDemand <= 0 ? 1 : clamp01(powerSupply / powerDemand);

  const covCommerce = coverage(commerceCap, pop);
  const covEducation = coverage(educationCap, pop);
  const covCultureLeisure = coverage(cultureCap + leisureCap, pop);
  const covHealth = coverage(healthCap, pop);
  const covSafety = coverage(safetyCap, pop);

  const powerOk = powerRatio >= 1;
  const jobsOk = unemployment <= UNEMPLOYMENT_N1_MAX;
  const coverageDetail = computeCoverage(state, { powerOk, jobsOk });

  // needLevel global = niveau où ≥50 % des hab. sont au moins à ce niveau
  let needLevel: NeedLevel = 0;
  const pct = coverageDetail.distributionPct;
  if (pct[1] + pct[2] + pct[3] >= 50) needLevel = 1;
  if (pct[2] + pct[3] >= 50) needLevel = 2;
  if (pct[3] >= 50) needLevel = 3;
  // Fallback si pas de logements : ancien calcul global
  if (housing <= 0) {
    needLevel = 0;
    if (powerOk && jobsOk && covCommerce >= 1) {
      needLevel = 1;
      if (covEducation >= 1) {
        needLevel = 2;
        if (covCultureLeisure >= 1) needLevel = 3;
      }
    }
  }

  let attractiveness =
    ATTRACTIVENESS_BY_NEED[needLevel] -
    ATTRACT_POLLUTION_PENALTY * Math.max(0, pollution) +
    ATTRACT_LEISURE_BONUS * leisurePoints;
  attractiveness = Math.min(ATTRACT_MAX, Math.max(ATTRACT_MIN, attractiveness));

  let targetPopulation = housing * attractiveness;
  if (unemployment > UNEMPLOYMENT_TARGET_PENALTY) {
    targetPopulation *= 0.7;
  }
  if (powerRatio < POWER_TARGET_PENALTY) {
    targetPopulation *= 0.3;
  }

  const freeJobs = Math.max(0, jobs - activeWorkers);
  const demandR = jobs <= 0 ? 0 : clamp01(freeJobs / jobs) * 100;
  const demandC = clamp01(1 - Math.min(1, covCommerce)) * 100;
  const demandI = unemployment * 100;

  const advice = buildAdvice({
    powerSupply,
    powerDemand,
    powerRatio,
    unemployment,
    covCommerce,
    covEducation,
    covCultureLeisure,
    needLevel,
    housing,
    pop,
    needDistributionPct: pct,
  });

  return {
    powerSupply,
    powerDemand,
    powerRatio,
    jobs,
    activeWorkers,
    unemployment,
    staffingRatio,
    housing,
    population: pop,
    coverage: {
      commerce: covCommerce,
      education: covEducation,
      cultureLeisure: covCultureLeisure,
      health: covHealth,
      safety: covSafety,
    },
    needLevel,
    needDistributionPct: pct,
    housingNeeds: coverageDetail.byHousing,
    coverageDetail,
    attractiveness,
    targetPopulation,
    demandRCI: { R: demandR, C: demandC, I: demandI },
    pollution,
    leisurePoints,
    advice,
  };
}

function coverage(capacity: number, population: number): number {
  if (population <= 0) return capacity > 0 ? 1 : 0;
  return capacity / population;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function buildAdvice(p: {
  powerSupply: number;
  powerDemand: number;
  powerRatio: number;
  unemployment: number;
  covCommerce: number;
  covEducation: number;
  covCultureLeisure: number;
  needLevel: NeedLevel;
  housing: number;
  pop: number;
  needDistributionPct: Record<NeedLevel, number>;
}): string[] {
  const advice: string[] = [];
  if (p.powerRatio < 1) {
    const missing = Math.ceil(p.powerDemand - p.powerSupply);
    advice.push(
      missing > 0
        ? `Il manque ${missing} MW`
        : "Construis une centrale"
    );
  }
  if (p.unemployment > UNEMPLOYMENT_N1_MAX) {
    advice.push("Crée plus d'emplois (industrie, commerce)");
  }
  if (p.covCommerce < 1) {
    advice.push("Étends le commerce près des logements");
  }
  if (p.needLevel >= 1 && p.covEducation < 1) {
    advice.push("Place une école à portée des maisons");
  }
  if (p.needLevel >= 2 && p.covCultureLeisure < 1) {
    advice.push("Ajoute parc, église ou loisirs à proximité");
  }
  if (p.housing <= 0 || (p.pop > 0 && p.housing < p.pop)) {
    advice.push("Construis des maisons");
  }
  const top = ([3, 2, 1, 0] as NeedLevel[]).find(
    (n) => p.needDistributionPct[n] > 0
  );
  if (advice.length === 0 && top != null) {
    advice.push(`${p.needDistributionPct[top]} % des habitants en N${top}`);
  }
  if (advice.length === 0 && p.needLevel >= 3) {
    advice.push("Ville épanouie — vise le monument !");
  }
  return advice;
}
