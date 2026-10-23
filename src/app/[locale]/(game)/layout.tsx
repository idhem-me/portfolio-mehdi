import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isVillageEnabled } from "@/game/flags";
import { routing } from "@/i18n/routing";

/** next-intl / flag serveur — hors shell static strict. */
export const instant = false;

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function GameLayout({ children, params }: Props) {
  if (!isVillageEnabled()) {
    notFound();
  }

  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <TooltipProvider>
      <div
        className="h-dvh w-full overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #7FD3E0 0%, #3BA7C4 100%)",
        }}
      >
        {children}
      </div>
    </TooltipProvider>
  );
}
