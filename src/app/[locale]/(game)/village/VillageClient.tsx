"use client";

import dynamic from "next/dynamic";
import { VillageLoader } from "@/game/ui/VillageLoader";

const Game = dynamic(() => import("@/game/ui/Game"), {
  ssr: false,
  loading: () => <VillageLoader />,
});

export function VillageClient() {
  return <Game />;
}
