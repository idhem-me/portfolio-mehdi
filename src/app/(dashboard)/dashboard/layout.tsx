import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Analytics PostHog & Clarity — aperçu interne.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full">
      <header className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-6">
          <p className="text-sm font-medium tracking-tight">
            Dashboard · Analytics
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Retour au site
          </Link>
        </div>
      </header>
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  );
}
