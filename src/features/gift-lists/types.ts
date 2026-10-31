export const occasions = [
  { value: "birth", label: "Naissance" },
  { value: "birthday", label: "Anniversaire" },
  { value: "christmas", label: "Noël" },
  { value: "wedding", label: "Mariage" },
  { value: "other", label: "Autre occasion" },
] as const;

export type GiftList = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  occasion_type: string;
  occasion_label: string | null;
  cover_image: string | null;
  is_surprise_mode: boolean;
  reservations_revealed_at: string | null;
  payment_info: string | null;
};
export type GiftItem = {
  id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  price: number | null;
  is_group_gift: boolean;
  priority: "normal" | "high";
};
export type Reservation = {
  id: string;
  item_id: string;
  guest_name: string;
  guest_email: string | null;
  message: string | null;
  amount_contributed: number | null;
};
export type OwnerDetail = {
  list: GiftList;
  items: GiftItem[];
  activity: { hidden: boolean; reservations?: Reservation[] };
};
export type PublicItem = GiftItem & {
  reserved: boolean;
  amount_contributed: number;
  guest_names: string[];
};
export type PublicList = Pick<
  GiftList,
  | "title"
  | "description"
  | "slug"
  | "occasion_type"
  | "occasion_label"
  | "cover_image"
  | "payment_info"
> & {
  items: PublicItem[];
};
export function euro(value: number | null | undefined) {
  return value == null
    ? "Prix libre"
    : new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(value);
}
export function isGiftPath(path: string) {
  return /^\/(?:fr\/|en\/|zh\/|ar\/|es\/|it\/|de\/)?(?:l\/|listes(?:\/|$)|outils\/listes-cadeaux(?:\/|$))/.test(
    path,
  );
}
export function safeWebUrl(value: string | null | undefined): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
