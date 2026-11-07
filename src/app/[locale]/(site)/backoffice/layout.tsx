import { BackofficeShell } from "@/features/backoffice/ui/shell";
export const metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <BackofficeShell>{children}</BackofficeShell>;
}
