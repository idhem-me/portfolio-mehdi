# Plan — contrastes du sélecteur de plage de dates

## Constat

Le composant partagé `src/components/ui/date-range-select.tsx` définit directement les états du calendrier. Les jours hors mois et désactivés réduisent `muted-foreground` à 40 % et 30 %, et les jours du milieu de plage n'ont pas de fond visible. Les dates de début et de fin superposent un fond `primary` à 15 % au fond par défaut, tandis que leurs nombres deviennent `primary-foreground` uniquement lorsqu'ils sont sélectionnés. Ces combinaisons peuvent manquer de contraste selon les thèmes, le mode clair/sombre et les états de sélection.

## Proposition de vérification

Évaluer les couleurs calculées des jours ordinaires, aujourd'hui, hors mois, désactivés, début, milieu et fin de plage dans Sobre et Fun, en clair et sombre. Vérifier aussi le focus clavier et les états de hover. Conserver les tokens sémantiques existants et corriger les classes d'état du calendrier; aucun changement de route, de texte, de donnée ou de thème n'est prévu.

## Périmètre proposé après validation

- `src/components/ui/date-range-select.tsx` — correction des classes de contraste et des états de sélection.
- `src/app/[locale]/(site)/playground/catalog.tsx` — uniquement si la démo doit être ajustée pour exposer les états concernés.
- `docs/design-system/playground-coverage.md` — uniquement si les états ou leur couverture changent.
- `docs/design-system/CHANGELOG.md` — note du changement de DS.
- `AGENTS.md` — mise à jour des règles de couverture si nécessaire.

Aucune suppression n'est prévue. Les jeux cachés, URL publiques, i18n, Supabase et Vercel ne sont pas concernés.

## Vérification proposée

Après validation et implémentation, exécuter lint, typecheck, build et les tests pertinents; noter les commandes bloquées par l'environnement. Le calendrier existant sert de démo sur `/playground`.

## Décision

Le 9 novembre 2026, le propriétaire demande explicitement de committer et pousser toutes les modifications locales existantes.

## Vérification avant publication — 9 novembre 2026

- `npm run lint` et `npm run typecheck` : réussis.
- `npm test`, `npm run test:burger`, `npm run test:cards` et `npm run test:security` : réussis.
- `npm run build` : bloqué à deux reprises par un autre processus Next.js build (message « Another next build process is already running »). Aucun verrou supprimé.
- Inspection des processus via `ps` : refusée par le sandbox.
- Tests navigateur non exécutés dans cette passe de publication.
