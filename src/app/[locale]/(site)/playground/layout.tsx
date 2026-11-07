import type { ReactNode } from "react";
import { PlaygroundNavigation } from "./navigation";

export const metadata = { title: "Playground" };

export default function PlaygroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh min-w-0">
      <PlaygroundNavigation />
      <div className="min-w-0 flex-1 pb-32 md:pb-0">{children}</div>
    </div>
  );
}
