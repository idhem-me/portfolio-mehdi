"use client";

import { track as usage } from "@/lib/tracking/client";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DesignSystemChoiceMenu } from "@/components/design-system/choice-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, routing, type Locale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  return (
    <DesignSystemChoiceMenu
      label={t("label")}
      value={locale}
      icon={<Languages className="size-4 shrink-0" />}
      choices={routing.locales.map((code) => ({
        value: code,
        label: localeNames[code],
      }))}
      onChange={(next) => {
        if (next !== locale) {
          usage.increment("lang_changes");
          router.replace(pathname, { locale: next as Locale });
        }
      }}
      analyticsAction="language"
    />
  );
}
