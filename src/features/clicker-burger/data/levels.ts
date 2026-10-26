// Bonus bâtiment doux : le CA vient surtout du réseau (restos / marchés),
// pas d’un ×512 magique. Coûts restent exponentiels.
export const LEVELS = [
  {
    name: "Burger Table",
    image: "/assets/burger/table.png",
    cost: "0",
    multiplier: 1,
  },
  {
    name: "Burger Stand",
    image: "/assets/burger/stand.png",
    cost: "5000",
    multiplier: 1.15,
  },
  {
    name: "Burger Restaurant",
    image: "/assets/burger/restaurant.png",
    cost: "250000",
    multiplier: 1.35,
  },
  {
    name: "Burger Warehouse",
    image: "/assets/burger/warehouse.png",
    cost: "1000000",
    multiplier: 1.6,
  },
  {
    name: "Burger International",
    image: "/assets/burger/international.png",
    cost: "500000000",
    multiplier: 1.9,
  },
  {
    name: "Burger Mars",
    image: "/assets/burger/mars.png",
    cost: "10000000000",
    multiplier: 2.4,
  },
  {
    name: "Système solaire",
    image: "/assets/burger/solar.png",
    cost: "1000000000000",
    multiplier: 3.1,
  },
  {
    name: "Burger Quantique",
    image: "/assets/burger/quantum.png",
    cost: "100000000000000",
    multiplier: 4.2,
  },
  {
    name: "Burger Intergalactique",
    image: "/assets/burger/intergalactic.png",
    cost: "10000000000000000",
    multiplier: 5.5,
  },
  {
    name: "Univers",
    image: "/assets/burger/universe.png",
    cost: "1000000000000000000",
    multiplier: 7,
  },
] as const;
