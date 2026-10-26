export type Project = {
  id: string;
  name: string;
  description: string;
  era: number;
  requiresResearch: string[];
  money: number;
  stock: number;
  ingredients: number;
};

/** Projets multi-ressources : cash + stock/ingrédients → avancée permanente. */
export const PROJECTS: Project[] = [
  {
    id: "test-kitchen",
    name: "Cuisine d’essai",
    description: "Demande permanente ×1,1.",
    era: 2,
    requiresResearch: ["franchise"],
    money: 12000,
    stock: 150,
    ingredients: 80,
  },
  {
    id: "pilot-line",
    name: "Ligne pilote",
    description: "Récoltes et distribution ×1,2.",
    era: 2,
    requiresResearch: ["franchise", "coldchain"],
    money: 28000,
    stock: 0,
    ingredients: 400,
  },
];
