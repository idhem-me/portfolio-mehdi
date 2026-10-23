import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Ancienne URL → /realisations/onewallet */
export default async function OneWalletLegacyRedirect({ params }: Props) {
  const { locale } = await params;
  redirect(
    locale === routing.defaultLocale
      ? "/realisations/onewallet"
      : `/${locale}/realisations/onewallet`
  );
}
