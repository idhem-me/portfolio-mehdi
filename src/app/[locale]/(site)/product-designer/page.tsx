import { permanentRedirect } from "next/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProductDesignerLegacyRedirect({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(
    locale === routing.defaultLocale ? "/a-propos" : `/${locale}/a-propos`,
  );
}
