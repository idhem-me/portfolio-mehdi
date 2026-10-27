/** Keep SQL cards_private.shop_catalog in sync; covered by catalog/migration tests. */
export const CREDIT_PACKS = [100, 500, 1000, 10000, 50000].map((amount) => ({
  id: `credits-${amount}`,
  amount,
}));
export const BOOSTER_PACKS = [1, 5, 10, 100, 500].map((amount) => ({
  id: `boosters-${amount}`,
  amount,
  price: amount * 100,
}));
export const COSMETICS = [
  {
    id: "custom-avatar",
    name: "Avatar personnalisé",
    price: 100,
    kind: "avatar",
  },
  {
    id: "frame-flowers",
    name: "Fleurs",
    price: 500,
    kind: "frame",
    asset: "/cosmetics/frames/flowers.png",
  },
  {
    id: "frame-gold",
    name: "Or",
    price: 1000,
    kind: "frame",
    asset: "/cosmetics/frames/gold.png",
  },
  {
    id: "frame-shiny",
    name: "Brillant",
    price: 10000,
    kind: "frame",
    asset: "/cosmetics/frames/shiny.png",
  },
  { id: "theme-blue", name: "Thème Bleu", price: 1000, kind: "theme" },
  { id: "theme-red", name: "Thème Rouge", price: 1000, kind: "theme" },
] as const;
export type CosmeticId = (typeof COSMETICS)[number]["id"];
export const formatCredits = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value);
export type ShopTab = "credits" | "boosters" | "cosmetiques" | "abonnements";
export const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: "credits", label: "Crédits" },
  { id: "boosters", label: "Boosters" },
  { id: "cosmetiques", label: "Cosmétiques" },
  { id: "abonnements", label: "Abonnements" },
];
