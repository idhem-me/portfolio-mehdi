import type { Locale } from "./routing";
import ar from "../../messages/ar.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import it from "../../messages/it.json";
import zh from "../../messages/zh.json";

/** Messages UI (nav, contact, theme…) — imports statiques des JSON. */
export const messagesByLocale = {
  fr,
  en,
  zh,
  ar,
  es,
  it,
  de,
} as const satisfies Record<Locale, typeof fr>;

export function getMessagesForLocale(locale: string) {
  if (locale in messagesByLocale) {
    return messagesByLocale[locale as Locale];
  }
  return messagesByLocale.fr;
}
