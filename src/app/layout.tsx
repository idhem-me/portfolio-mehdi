import { SiteAccountProvider } from "@/features/account/provider";
import type { Metadata } from "next";
import { Geist_Mono, Google_Sans, Noto_Sans_SC } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AnalyticsRoot } from "@/lib/analytics/analytics-root";
import { profileMeta } from "@/data/profile-meta";
import frMessages from "../../messages/fr.json";
import { DesignSystemProvider } from "@/components/design-system/provider";
import "@primer/primitives/dist/css/base/size/size.css";
import "@primer/primitives/dist/css/base/typography/typography.css";
import "@primer/primitives/dist/css/functional/size/border.css";
import "@primer/primitives/dist/css/functional/size/radius.css";
import "@primer/primitives/dist/css/functional/size/size.css";
import "@primer/primitives/dist/css/functional/typography/typography.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";
import "./globals.css";
import "@/components/design-system/design-system.css";

const googleSans = Google_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cjk",
  display: "swap",
});

const notoSansArabic = localFont({
  src: "./fonts/NotoSansArabic.ttf",
  weight: "100 900",
  variable: "--font-arabic",
  display: "swap",
});

/** ThemeProvider / analytics : hors shell static strict. */
export const instant = false;

export const metadata: Metadata = {
  title: {
    default: profileMeta.siteTitle,
    template: `%s · ${profileMeta.siteTitle}`,
  },
  description:
    "Senior Product Designer — UX/UI, design systems, accessibilité RGAA.",
  authors: [{ name: profileMeta.name }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      dir="ltr"
      suppressHydrationWarning
      className={`${googleSans.variable} ${geistMono.variable} ${notoSansSc.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body
        className={`${googleSans.className} min-h-full bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DesignSystemProvider>
            <NextIntlClientProvider locale="fr" messages={frMessages}>
              <SiteAccountProvider>
                <AnalyticsRoot>{children}</AnalyticsRoot>
              </SiteAccountProvider>
            </NextIntlClientProvider>
          </DesignSystemProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
