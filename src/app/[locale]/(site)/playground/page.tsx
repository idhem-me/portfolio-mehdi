import { PlaygroundCatalog } from "./catalog";
import { DesignSystemsComparison } from "./comparison";
import { PlaygroundNavigation } from "./navigation";

export const metadata = { title: "Playground" };

export default function PlaygroundPage() {
  return (
    <div className="flex min-h-svh min-w-0">
      <PlaygroundNavigation />
      <div className="min-w-0 flex-1 pb-32 md:pb-0">
        <PlaygroundCatalog />
        <DesignSystemsComparison />
      </div>
    </div>
  );
}
