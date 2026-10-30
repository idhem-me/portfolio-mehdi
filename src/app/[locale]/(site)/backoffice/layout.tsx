import { BackofficeShell } from "@/components/backoffice/shell";
export const metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <BackofficeShell>{children}</BackofficeShell>;
}
