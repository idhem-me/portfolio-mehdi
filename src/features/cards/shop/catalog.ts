/** Keep SQL cards_private.shop_catalog in sync; covered by catalog/migration tests. */
export const CREDIT_PACKS = [100, 500, 1000, 10000, 50000].map((amount) => ({
  id: `credits-${amount}`,
  amount,
}));
export const COSMETICS = [
  { id: "theme-blue", name: "Thème Bleu", price: 1000, kind: "theme" },
  { id: "theme-red", name: "Thème Rouge", price: 1000, kind: "theme" },
] as const;
export type CosmeticId = (typeof COSMETICS)[number]["id"];
export const formatCredits = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value);
export type ShopTab = "credits" | "cosmetiques" | "abonnements";
export const SHOP_TABS: { id: ShopTab; label: string }[] = [
  { id: "credits", label: "Gems" },
  { id: "cosmetiques", label: "Cosmétiques" },
  { id: "abonnements", label: "Abonnements" },
];
