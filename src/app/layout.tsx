import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AnalyticsRoot } from "@/components/analytics/analytics-root";
import { profileMeta } from "@/data/profile-meta";
import { DesignSystemProvider } from "@/components/design-system/provider";
import { DEFAULT_DESIGN_SYSTEM } from "@/components/design-system/registry";
import "./globals.css";
import "@/components/design-system/design-system.css";

const googleSans = localFont({
  src: "./fonts/Google-Sans-Latin.woff2",
  weight: "400 700",
  variable: "--font-google-sans",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const googleSansExt = localFont({
  src: "./fonts/Google-Sans-Latin-Ext.woff2",
  weight: "400 700",
  variable: "--font-google-sans-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const nunitoSans = localFont({
  src: [
    {
      path: "./fonts/Nunito-Sans-Latin.woff2",
      weight: "200 1000",
      style: "normal",
    },
    {
      path: "./fonts/Nunito-Sans-Italic-Latin.woff2",
      weight: "200 1000",
      style: "italic",
    },
  ],
  variable: "--font-nunito-sans",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const nunitoSansExt = localFont({
  src: [
    {
      path: "./fonts/Nunito-Sans-Latin-Ext.woff2",
      weight: "200 1000",
      style: "normal",
    },
    {
      path: "./fonts/Nunito-Sans-Italic-Latin-Ext.woff2",
      weight: "200 1000",
      style: "italic",
    },
  ],
  variable: "--font-nunito-sans-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
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
  preload: false,
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
  preload: false,
});

const bricolageGrotesque = localFont({
  src: "./fonts/Bricolage-Grotesque-Latin.woff2",
  weight: "200 800",
  variable: "--font-bricolage",
  display: "swap",
  preload: false,
});

const bricolageGrotesqueExt = localFont({
  src: "./fonts/Bricolage-Grotesque-Latin-Ext.woff2",
  weight: "200 800",
  variable: "--font-bricolage-ext",
  display: "swap",
  preload: false,
});

const geistMono = localFont({
  src: "./fonts/Geist-Mono-Latin.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

const geistMonoExt = localFont({
  src: "./fonts/Geist-Mono-Latin-Ext.woff2",
  weight: "100 900",
  variable: "--font-geist-mono-ext",
  display: "swap",
  preload: false,
});

const notoSansSc = localFont({
  src: "./fonts/Noto-Sans-SC-Latin.woff2",
  weight: "400 700",
  variable: "--font-cjk",
  display: "swap",
  preload: false,
});

const notoSansArabic = localFont({
  src: "./fonts/NotoSansArabic.ttf",
  weight: "100 900",
  variable: "--font-arabic",
  display: "swap",
  preload: false,
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
      className={`${googleSans.variable} ${googleSansExt.variable} ${nunitoSans.variable} ${nunitoSansExt.variable} ${openSans.variable} ${openSansExt.variable} ${bricolageGrotesque.variable} ${bricolageGrotesqueExt.variable} ${geistMono.variable} ${geistMonoExt.variable} ${notoSansSc.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <head>
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
            <AnalyticsRoot>{children}</AnalyticsRoot>
          </DesignSystemProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
