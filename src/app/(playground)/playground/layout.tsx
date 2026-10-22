import type { Metadata } from "next";
import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Playground",
  description: "Banc d’essai des composants Shadcn / design system.",
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="min-h-full">
        <header className="border-b border-border/60 bg-muted/30">
          <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-6">
            <p className="text-sm font-medium tracking-tight">
              Playground · Design System
            </p>
            <Link
              href="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ← Retour au site
            </Link>
          </div>
        </header>
        {children}
      </div>
    </TooltipProvider>
  );
}
