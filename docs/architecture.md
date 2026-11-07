# Architecture du portfolio

## Frontières cibles

| Couche | Responsabilité et convention |
| --- | --- |
| `src/app` | Routes, layouts, métadonnées, lecture de la locale et contrôles serveur. Les groupes actuels restent en place pour limiter le risque sur les URL et les layouts. `/playground` utilise le layout du site et réunit la vitrine et la comparaison. |
| `src/features/<nom>` | UI, domaine et données propres à une expérience. Sous-dossiers `ui/`, `server/`, `engine/` ou `persistence/` uniquement s’ils ont une responsabilité distincte. Nom du dossier en kebab-case. |
| `src/components` | Primitives DS, layout, media et UI utilisée par plusieurs domaines. Conserver les réglages communs aux jeux et les composants créatifs tant que leurs usages croisés subsistent. |
| `src/lib` | Fonctions et intégrations transverses sans rendu React. Conserver les contrats d’analytics séparés de la collecte backoffice, et regrouper leurs points de montage dans `components/analytics`. |
| `src/hooks`, `src/data` | Hooks et données partagés. Un hook propre à une expérience rejoint sa feature. |
| `content`, `messages`, `src/i18n` | Markdown avec frontmatter JSON pour le contenu éditorial, messages JSON pour les libellés, next-intl pour le routage et le formatage. Français de référence et parité à sept. |
| `supabase/migrations` | Chaîne de référence pour une installation reproductible après réconciliation du bootstrap cadeaux. Les types générés doivent provenir de ce schéma validé. |
| `scripts`, `tests`, `docs` | Scripts par feature, unitaires colocalisés ou par domaine selon l’existant, Playwright sous `tests`, docs historiques accessibles. Voir [le plan](PLAN.md) pour les chemins exacts. |

- Server Components par défaut. Utiliser un îlot client pour DOM, état interactif, jeux, traitement de fichiers et providers. Encadrer les imports à privilèges avec `server-only`.
- Route Handlers pour JSON, clients existants, OAuth, cron et endpoints partageables. Réserver les Server Actions aux futures mutations de formulaire liées à une page et valider autorisation et entrées dans l’action. Les API existantes restent compatibles.
- Proxy pour locale, masquage et redirections rapides. Vérifier l’identité et l’autorisation au point d’accès aux données. Éviter la double consultation de session mesurée sur les mêmes parcours.
- Garder `vendor/deepmerge` et `vendor/minimatch-compat` tant que la correction amont, la compatibilité ESLint et les tests ne sont pas démontrés. Les overrides sont déjà en place. `public/vendor` est un miroir navigateur versionné, alimenté par `scripts/sync-image-compression.mjs`. Revoir sa génération séparément après avoir prouvé le contrat de chargement.
- Les imports dynamiques, scripts, overrides et chemins d’assets font partie de la recherche de code mort. Aucun retrait proposé à partir d’une absence de grep ou de Knip seul.
- `AGENTS.md` centralise les règles i18n et design system. Le guide DS détaille les conventions UI et le playground présente les primitives avec leurs variantes.

## Ajouter un outil ou un jeu

1. Créer `src/features/<nom>/` et une route mince dans le groupe adapté. Définir état public, permissions, indexation et navigation avant publication.
2. Réutiliser les primitives et tokens du DS. Garder rendu, interactions et logique métier dans la feature. Garder les opérations locales côté navigateur si elles ne nécessitent aucune donnée distante.
3. Ajouter les libellés aux sept dictionnaires, le contenu éditorial aux sept variantes concernées et les cas incertains dans `docs/i18n-review.md`. Vérifier ICU, RTL et longueurs de texte.
4. Si persistance, définir propriété, RLS, grants, index et limites dans une migration. Prévoir panne et reprise sans écraser les données locales.
5. Documenter les entrées, sauvegardes et scénarios. Tester téléphone, clavier, thèmes, sept chemins localisés, erreurs, visibilité et non-régression des URL. Lancer lint, typecheck, build et suites concernées.

Référence locale consultée pour Next 16.4.2 dans `node_modules/next/dist/docs/01-app/01-getting-started`. Guides structure, Server/Client Components, mutations, cache, Route Handlers et proxy.
