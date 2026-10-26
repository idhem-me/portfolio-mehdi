// Revenue gates rise exponentially; each era also requires its infrastructure.
export const LEVELS = [
  {
    name: "Table",
    image: "/assets/burger/table.png",
    cost: "0",
    multiplier: 1,
  },
  {
    name: "Burger Stand",
    image: "/assets/burger/stand.png",
    cost: "5000",
    multiplier: 2,
  },
  {
    name: "Burger Restaurant",
    image: "/assets/burger/restaurant.png",
    cost: "100000",
    multiplier: 4,
  },
  {
    name: "Burger Warehouse",
    image: "/assets/burger/warehouse.png",
    cost: "1000000",
    multiplier: 8,
  },
  {
    name: "Burger International",
    image: "/assets/burger/international.png",
    cost: "500000000",
    multiplier: 16,
  },
  {
    name: "Burger Mars",
    image: "/assets/burger/mars.png",
    cost: "10000000000",
    multiplier: 32,
  },
  {
    name: "Système solaire",
    image: "/assets/burger/solar.png",
    cost: "1000000000000",
    multiplier: 64,
  },
  {
    name: "Burger Quantique",
    image: "/assets/burger/quantum.png",
    cost: "100000000000000",
    multiplier: 128,
  },
  {
    name: "Burger Intergalactique",
    image: "/assets/burger/intergalactic.png",
    cost: "10000000000000000",
    multiplier: 256,
  },
  {
    name: "Univers",
    image: "/assets/burger/universe.png",
    cost: "1000000000000000000",
    multiplier: 512,
  },
] as const;
