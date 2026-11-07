# Contenu multilingue

## Source de vérité

Édite **uniquement** :

- `content/fr/*.md` — pages et données (profil, expériences, compétences…)
- `messages/fr.json` — chrome UI (nav, thème, consentement, CTAs)

## Traductions

Locales générées : `en`, `zh`, `ar`, `es`, `it`, `de`.

Après une modification du contenu français, suivre les [règles de synchronisation i18n](../AGENTS.md#synchronisation-i18n) pour les six autres langues.

## Règles

- Frontmatter des `.md` en **JSON** (entre `---`), pas en YAML
- Ne pas changer les clés JSON
- Conserver URLs, emails, téléphones, chemins de logos
- Conserver les noms propres (Mehdi, Worldline, Figma…)
