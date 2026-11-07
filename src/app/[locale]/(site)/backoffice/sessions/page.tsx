export const instant = false;
import { Sessions } from "@/features/backoffice/ui/sessions";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense>
      <Sessions />
    </Suspense>
  );
}
