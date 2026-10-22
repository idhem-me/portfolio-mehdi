# Contenu multilingue

## Source de vérité

Édite **uniquement** :

- `content/fr/*.md` — pages et données (profil, expériences, compétences…)
- `messages/fr.json` — chrome UI (nav, thème, consentement, CTAs)

## Traductions

Locales générées : `en`, `zh`, `ar`, `es`, `it`, `de`.

Après une modification FR, demande à l’agent Cursor de synchroniser (la règle `.cursor/rules/i18n-content.mdc` s’applique quand ces fichiers sont dans le contexte).

## Règles

- Ne pas changer les clés YAML/JSON
- Conserver URLs, emails, téléphones, chemins de logos
- Conserver les noms propres (Mehdi, Worldline, Figma…)
