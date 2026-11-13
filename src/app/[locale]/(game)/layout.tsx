import { SiteAccountProvider } from "@/features/account/provider";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <SiteAccountProvider>{children}</SiteAccountProvider>;
}
