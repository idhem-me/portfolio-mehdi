import type { Metadata } from "next";
import { CancelReservation } from "@/features/gift-lists/ui/public";
export const metadata: Metadata = {
  title: "Annuler ma réservation",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};
export default function Page() {
  return <CancelReservation />;
}
