import { SiteAccountProvider } from "@/features/account/provider";
import type { Metadata } from "next";
import { Google_Sans, Nunito_Sans } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AnalyticsRoot } from "@/components/analytics/analytics-root";
import { profileMeta } from "@/data/profile-meta";
import frMessages from "../../messages/fr.json";
import { DesignSystemProvider } from "@/components/design-system/provider";
import {
  DEFAULT_DESIGN_SYSTEM,
  initialDesignSystemScript,
} from "@/components/design-system/registry";
import "./globals.css";
import "@/components/design-system/design-system.css";
import "@/components/design-system/fun.css";
import "@/components/design-system/frutiger-aero.css";
import "@/components/design-system/liquid-glass.css";

const googleSans = Google_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-google-sans",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-nunito-sans",
  display: "swap",
});

const openSans = localFont({
  src: [
    {
      path: "./fonts/Open-Sans-Latin.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "./fonts/Open-Sans-Italic-Latin.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-open-sans",
  display: "swap",
});

const openSansExt = localFont({
  src: [
    {
      path: "./fonts/Open-Sans-Latin-Ext.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "./fonts/Open-Sans-Italic-Latin-Ext.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-open-sans-ext",
  display: "swap",
});

const bricolageGrotesque = localFont({
  src: "./fonts/Bricolage-Grotesque-Latin.woff2",
  weight: "200 800",
  variable: "--font-bricolage",
  display: "swap",
});

const bricolageGrotesqueExt = localFont({
  src: "./fonts/Bricolage-Grotesque-Latin-Ext.woff2",
  weight: "200 800",
  variable: "--font-bricolage-ext",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/Geist-Mono-Latin.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
});

const geistMonoExt = localFont({
  src: "./fonts/Geist-Mono-Latin-Ext.woff2",
  weight: "100 900",
  variable: "--font-geist-mono-ext",
  display: "swap",
});

const notoSansSc = localFont({
  src: "./fonts/Noto-Sans-SC-Latin.woff2",
  weight: "400 700",
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
      data-design-system={DEFAULT_DESIGN_SYSTEM}
      suppressHydrationWarning
      className={`${googleSans.variable} ${nunitoSans.variable} ${openSans.variable} ${openSansExt.variable} ${bricolageGrotesque.variable} ${bricolageGrotesqueExt.variable} ${geistMono.variable} ${geistMonoExt.variable} ${notoSansSc.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <head>
        <script
          id="initial-design-system"
          dangerouslySetInnerHTML={{ __html: initialDesignSystemScript }}
        />
        <script
          id="initial-theme"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"system";var r=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(r);if(r==="light"||r==="dark")d.style.colorScheme=r}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="min-h-full bg-background text-foreground"
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
