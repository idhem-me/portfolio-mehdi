import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DocumentLocale } from "@/components/layout/document-locale";
import { getMessagesForLocale } from "@/i18n/messages";
import { routing } from "@/i18n/routing";

/** next-intl lit encore des APIs request ; opt-out validation Cache Components. */
export const instant = false;

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = getMessagesForLocale(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLocale locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
