import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DASHBOARD_COOKIE, isValidDashboardToken } from "@/lib/dashboard-auth";
import { BackofficeShell } from "@/components/backoffice/shell";
export const metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};
async function ProtectedBackoffice({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  if (!(await isValidDashboardToken(store.get(DASHBOARD_COOKIE)?.value)))
    redirect("/dashboard/login?next=/backoffice");
  return <BackofficeShell>{children}</BackofficeShell>;
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProtectedBackoffice>{children}</ProtectedBackoffice>
    </Suspense>
  );
}
