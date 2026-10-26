import { D, type State } from "../engine/game";
import {
  EUROPE_CITIES,
  WORLD_CITIES,
  MOON_MARKETS,
  MARS_MARKETS,
} from "./content";

export type Mission = {
  id: string;
  /** Titre réel, révélé une fois la mission réussie. */
  title: string;
  /**
   * Intitulé flou tant que la mission n’est pas récupérée.
   * Absent = titre clair dès le départ (tutoriel early).
   */
  teaser?: string;
  target: number;
  reward: number;
  progress: (s: State) => number;
};

export const MISSIONS: Mission[] = [
  {
    id: "first-ten",
    title: "Préparer 10 burgers",
    target: 10,
    reward: 25,
    progress: (s: State) => s.manual,
  },
  {
    id: "first-sales",
    title: "Vendre 50 burgers",
    target: 50,
    reward: 60,
    progress: (s: State) => s.sold,
  },
  {
    id: "first-cook",
    title: "Embaucher un commis",
    target: 1,
    reward: 100,
    progress: (s: State) => s.counts.cook,
  },
  {
    id: "signature",
    title: "Créer la recette signature",
    target: 1,
    reward: 200,
    progress: (s: State) => Number(s.research.includes("recipe")),
  },
  {
    id: "revenue",
    title: "Atteindre 1 000 € de ventes",
    target: 1000,
    reward: 300,
    progress: (s: State) => D(s.earned).toNumber(),
  },
  {
    id: "franchise",
    title: "Créer une franchise",
    teaser: "Structurer votre expansion",
    target: 1,
    reward: 1000,
    progress: (s: State) => Number(s.research.includes("franchise")),
  },
  {
    id: "logistics",
    title: "Ouvrir un centre logistique",
    teaser: "Fluidifier la chaîne",
    target: 1,
    reward: 1500,
    progress: (s: State) => s.counts.warehouse,
  },
  {
    id: "markets",
    title: "Ouvrir 4 marchés",
    teaser: "Étendre votre présence",
    target: 4,
    reward: 5000,
    progress: (s: State) => s.markets.length,
  },
  {
    id: "world",
    title: "Lancer l’expansion internationale",
    teaser: "Élargir le menu",
    target: 1,
    reward: 100000,
    progress: (s: State) => Number(s.research.includes("global")),
  },
  {
    id: "national-cities",
    title: "Couvrir 3 villes européennes",
    teaser: "Renforcer le réseau",
    target: 3,
    reward: 250000,
    progress: (s: State) =>
      s.markets.filter((id) =>
        (EUROPE_CITIES as readonly string[]).includes(id),
      ).length,
  },
  {
    id: "first-rival",
    title: "Racheter un concurrent",
    teaser: "Gagner des parts de marché",
    target: 1,
    reward: 400000,
    progress: (s: State) => s.rivals.length,
  },
  {
    id: "megafactory",
    title: "Construire une mégafactory",
    teaser: "Augmenter la capacité",
    target: 1,
    reward: 2e6,
    progress: (s: State) => s.counts.megafactory,
  },
  {
    id: "continents",
    title: "Ouvrir 3 métropoles mondiales",
    teaser: "Accélérer l’expansion",
    target: 3,
    reward: 1e7,
    progress: (s: State) =>
      s.markets.filter((id) =>
        (WORLD_CITIES as readonly string[]).includes(id),
      ).length,
  },
  {
    id: "mars",
    title: "Ouvrir sur Mars",
    teaser: "Ouvrir un nouveau marché",
    target: 1,
    reward: 1e12,
    progress: (s: State) =>
      Number(
        s.markets.some((id) =>
          (MARS_MARKETS as readonly string[]).includes(id),
        ),
      ),
  },
  {
    id: "solar",
    title: "Tenir trois marchés solaires",
    teaser: "Consolider plusieurs marchés",
    target: 3,
    reward: 5e13,
    progress: (s: State) =>
      s.markets.filter((id) =>
        (
          [
            ...MOON_MARKETS,
            ...MARS_MARKETS,
            "europa",
            "titan",
          ] as readonly string[]
        ).includes(id),
      ).length,
  },
  {
    id: "multiverse",
    title: "Ouvrir un univers parallèle",
    teaser: "Tenter quelque chose d’inédit",
    target: 1,
    reward: 1e18,
    progress: (s: State) => Number(s.markets.includes("multiverse")),
  },
];

/** Titre affiché : teaser tant que non récupérée, vrai titre ensuite. */
export function missionLabel(m: Mission, s: State) {
  if (s.missionClaims.includes(m.id) || !m.teaser) return m.title;
  return m.teaser;
}

export function visibleMissions(s: State) {
  const next = MISSIONS.findIndex((m) => !s.missionClaims.includes(m.id));
  return MISSIONS.filter(
    (m, i) =>
      s.missionClaims.includes(m.id) ||
      i <= (next < 0 ? MISSIONS.length : next),
  );
}

export function claimMission(s: State, id: string) {
  const mission = visibleMissions(s).find((m) => m.id === id);
  if (
    !mission ||
    s.missionClaims.includes(id) ||
    mission.progress(s) < mission.target
  )
    return s;
  return {
    ...s,
    money: D(s.money).plus(mission.reward).toString(),
    missionClaims: [...s.missionClaims, id],
  };
}
