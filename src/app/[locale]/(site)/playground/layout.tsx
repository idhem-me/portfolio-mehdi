import type { ReactNode } from "react";
import { showLocalComponents } from "@/lib/playground-access";
import { PlaygroundNavigation } from "./navigation";

export const metadata = { title: "Playground" };

export default function PlaygroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh min-w-0">
      <PlaygroundNavigation showLocalComponents={showLocalComponents} />
      <div className="min-w-0 flex-1 pb-32 md:pb-0">{children}</div>
    </div>
  );
}
