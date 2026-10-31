import type { Metadata } from "next";
import { CreatorDashboard } from "@/features/gift-lists/ui/creator";
export const metadata: Metadata = {
  title: "Mes listes de cadeaux",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <CreatorDashboard />;
}
