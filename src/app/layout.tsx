import type { Metadata } from "next";
import {
  Geist_Mono,
  Google_Sans,
  Noto_Sans_Arabic,
  Noto_Sans_SC,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AnalyticsRoot } from "@/lib/analytics/analytics-root";
import { profileMeta } from "@/data/profile-meta";
import { isRtlLocale } from "@/i18n/routing";
import "./globals.css";

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

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${profileMeta.name} · ${profileMeta.role}`,
    template: `%s · ${profileMeta.name}`,
  },
  description:
    "Senior Product Designer — UX/UI, design systems, accessibilité RGAA.",
  authors: [{ name: profileMeta.name }],
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  let locale = "fr";
  let messages: Record<string, unknown> = {};
  try {
    locale = await getLocale();
    messages = await getMessages();
  } catch {
    messages = (await import("../../messages/fr.json")).default;
  }
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${googleSans.variable} ${geistMono.variable} ${notoSansSc.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body
        className={`${googleSans.className} min-h-full bg-background text-foreground ${
          locale === "zh" ? "[font-family:var(--font-cjk),var(--font-sans),sans-serif]" : ""
        } ${locale === "ar" ? "[font-family:var(--font-arabic),var(--font-sans),sans-serif]" : ""}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AnalyticsRoot>{children}</AnalyticsRoot>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
