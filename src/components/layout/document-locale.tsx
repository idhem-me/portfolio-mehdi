"use client";

import { useEffect } from "react";
import { isRtlLocale } from "@/i18n/routing";

/** Met à jour `lang` / `dir` sur `<html>` après navigation locale. */
export function DocumentLocale({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    document.documentElement.classList.toggle("locale-zh", locale === "zh");
    document.documentElement.classList.toggle("locale-ar", locale === "ar");
  }, [locale]);

  return null;
}
