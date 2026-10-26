import { D, type State } from "../engine/game";
export const MISSIONS = [
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
    target: 1,
    reward: 1000,
    progress: (s: State) => Number(s.research.includes("franchise")),
  },
  {
    id: "logistics",
    title: "Ouvrir un centre logistique",
    target: 1,
    reward: 1500,
    progress: (s: State) => s.counts.warehouse,
  },
  {
    id: "markets",
    title: "Ouvrir 4 marchés",
    target: 4,
    reward: 5000,
    progress: (s: State) => s.markets.length,
  },
  {
    id: "world",
    title: "Lancer l’expansion internationale",
    target: 1,
    reward: 100000,
    progress: (s: State) => Number(s.research.includes("global")),
  },
  {
    id: "mars",
    title: "Ouvrir sur Mars",
    target: 1,
    reward: 1e12,
    progress: (s: State) => Number(s.markets.includes("mars")),
  },
];
export function visibleMissions(s: State) {
  const next = MISSIONS.findIndex((m) => !s.missionClaims.includes(m.id));
  return MISSIONS.filter(
    (m, i) =>
      s.missionClaims.includes(m.id) ||
      i <= (next < 0 ? MISSIONS.length : next),
  );
}
export function claimMission(s: State, id: string): State {
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
