export const instant = false;
import { Sessions } from "@/components/backoffice/sessions";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense>
      <Sessions />
    </Suspense>
  );
}
