# Inventaire du dépôt

Relevé statique du 7 novembre 2026. Les états ci-dessous viennent des sources locales. Le réglage déployé, les données et le schéma distant restent à confirmer.

## Arborescence et dépendances

- `src/app` (routes, layouts, CSS, polices), `src/features` (account, cards, clicker-burger, gift-lists, pdf, tetris), `src/components` (UI partagée et UI métier), `src/lib` (métier et services), `src/data`, `src/hooks`, `src/i18n` et `src/proxy.ts`.
- `content/{ar,de,en,es,fr,it,zh}` (78 fichiers Markdown localisés), `messages/` (7 JSON), `public/` (108 fichiers suivis), `supabase/migrations/` (18 SQL).
- `docs/` (226 fichiers existants, dont 212 dans Tetris), `tests/` (45), `scripts/` (6), `tools/tetris/` (1), `vendor/` (9), `.cursor/rules/` et `.cursorrules`.
- Next 16.4.2, React 19.3, TypeScript 5.9, next-intl, Supabase JS et SSR, Tailwind 4, Radix, Primer, Spectrum, Playwright. Les utilitaires importants incluent Sharp, PDF-lib, Matter.js, Motion, Zod et libSQL. Voir `package.json` pour le manifeste complet.
- Scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:burger`, `test:cards`, `test:security`, `test:tetris:browser`, `test:tools`, `balance:burger`. `predev` et `prebuild` synchronisent l’asset de compression.
- `npx --offline --no-install knip` échoue faute de cache. `npx --no-install knip` échoue sur le DNS de npm. Aucun résultat Knip. Recherche statique : `useAnalyticsConsent` apparaît sans import applicatif, mais est référencé dans la documentation. `cn`, les dépendances vendor et le script de compression ont des usages directs ou indirects. Vérifier les points d’entrée de build et dynamiques avant tout retrait.

## Produits et visibilité

| Expérience | Statut observé |
| --- | --- |
| Générateur de couleurs, QR, compression et conversion d’images, fusion PDF, listes cadeaux | Six outils accessibles. Les listes et leurs liens de partage ont des en-têtes anti-indexation. |
| Clicker Burger | Activé et publié dans le code. |
| Tetris | Marqué non public. Activé uniquement par flag, qui permet aussi son affichage dans le catalogue. |
| Cards | Masquage manuel forcé et non public. |
| Terrain de jeu de l’accueil (gravité, pinceau, papier déchirable) | Expérience publique intégrée. Candidat au quatrième jeu, à confirmer avec le propriétaire. Trois jeux autonomes ont une route. |
| Boutique | Route liée à Cards, métadonnées anti-indexation. La page et le proxy ne contrôlent pas le flag sur cette URL. Voir SEC-03. |
| CV, OneWallet, Trusted Interactions | Site public. Tetris a un brouillon d’étude de cas et une ancienne route sous garde qui redirige vers le jeu. |

## i18n et design system

- Les 288 clés feuilles de `messages/fr.json` existent dans chaque langue, avec zéro clé supplémentaire par rapport au français. Le comptage compare les chemins, sans conclure sur la justesse, les paramètres ICU ou l’usage des clés.
- Seul fichier Markdown français sans équivalent dans les six autres langues, `case-studies/tetris.md`. Le lecteur Markdown utilise un fallback français. L’ancienne route Tetris redirige actuellement vers le jeu. Contrôler le périmètre caché avant toute traduction.
- `src/i18n/routing.ts` configure français par défaut sans préfixe, les six autres avec préfixe et RTL arabe. `request.ts` charge les dictionnaires statiquement référencés dans `messages.ts`.
- DS dans `src/components/ui`, `src/components/design-system`, `src/app/globals.css`, avec vitrines dans le groupe playground. Voir [l’inventaire DS](../design-system/inventory.md).

## Tables et stockage déclarés

| Domaine | Objets relevés et accès du code |
| --- | --- |
| Tetris | `tetris_sessions`, `tetris_scores`, `tetris_score_receipts`. `tetris_profiles` et `tetris_local_scores` historiques, toujours déclarées. La migration du 31 octobre vide les profils locaux et conserve les scores. Accès scores et sessions via RPC serveur. |
| Cards | `cards_progress` (compatibilité), `profiles`, `cards_saves`, `user_cosmetics` et schéma `cards_private` (`card_catalog`, `shop_catalog`, `operations`, `login_tickets`, `save_choices`). RPC de progression et transfert, accès à `user_cosmetics` et bucket privé `avatars`. |
| Cadeaux | `gift_lists`, `gift_items`, `gift_reservations` définies dans `docs/sql`. Les deux premières sont requêtées directement côté serveur, les réservations passent par RPC. |
| Backoffice | `visitors`, `sessions`, `backoffice_batches`, `backoffice_revoked`, `backoffice_windows`. Accès à sessions et batches côté serveur, agrégats et purge par RPC. |
| Sécurité | `security_sessions`, `security_budgets`, `security_leases`, `security_visitors`. Sessions, leases, visiteurs et quotas sont utilisés par les gardes serveur et les RPC. |

## Variables référencées

Noms extraits du code et des configurations, y compris les tests. Les fichiers d’environnement ont été exclus.
```
APPLE_AUTH_ENABLED CARDS_DB_PATH CRON_SECRET DASHBOARD_PASSWORD GIFT_LISTS_LIVE_TEST GOOGLE_CLIENT_ID
NEXT_PUBLIC_CLARITY_APP_URL NEXT_PUBLIC_CLARITY_ID NEXT_PUBLIC_ENABLE_ADOBE_DS NEXT_PUBLIC_ENABLE_CARDS
NEXT_PUBLIC_ENABLE_TETRIS NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD NEXT_PUBLIC_ENABLE_TETRIS_SOUND
NEXT_PUBLIC_POSTHOG_APP_URL NEXT_PUBLIC_POSTHOG_HOST NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_TEST_CAPTURE NEXT_PUBLIC_VERCEL_ANALYTICS_URL NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
NODE_ENV POSTHOG_PERSONAL_API_KEY POSTHOG_PROJECT_ID SECURITY_HASH_KEY SUPABASE_ANON_KEY
SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL TETRIS_DB_PATH
TETRIS_TEST_BASE_URL TETRIS_TEST_DISABLED TURSO_AUTH_TOKEN TURSO_DATABASE_URL VERCEL WEB3FORMS_ACCESS_KEY

```

## Registre des routes

Pour chaque URL localisée, le chemin ci-dessous est celui du français et peut être précédé de `/en`, `/ar`, `/de`, `/es`, `/it` ou `/zh`. Les parenthèses des groupes sont internes au routeur.

### (dashboard)

- `/dashboard/login`
- `/dashboard`

### (playground)

- `/playground/design-systems`
- `/playground/github-vs-adobe`
- `/playground`

### [locale] / (game)

- `/boutique`
- `/cards`
- `/jeux/cards`
- `/jeux/clicker-burger`
- `/jeux/tetris`

### [locale] / (gifts)

- `/l/[slug]`
- `/listes/[slug]`
- `/listes/annuler`

### [locale] / (site)

- `/a-propos`
- `/backoffice`
- `/backoffice/sessions`
- `/contact`
- `/jeux`
- `/outils/color-generator`
- `/outils/compression-image`
- `/outils/conversion-image`
- `/outils/fusion-pdf`
- `/outils/listes-cadeaux/[id]`
- `/outils/listes-cadeaux`
- `/outils`
- `/outils/qrcode`
- `/`
- `/product-designer/onewallet`
- `/product-designer`
- `/realisations/onewallet`
- `/realisations`
- `/realisations/tetris`
- `/realisations/trusted-interactions`

### api

- `/api/analytics/summary` — GET
- `/api/assets/svg/[...path]` — GET
- `/api/backoffice/me` — POST, GET, DELETE
- `/api/backoffice/sessions/[id]` — GET
- `/api/backoffice/sessions` — GET
- `/api/backoffice/stats` — GET
- `/api/contact` — POST
- `/api/cron/purge` — GET
- `/api/dashboard/login` — POST
- `/api/dashboard/logout` — POST
- `/api/gifts/[slug]` — GET, POST
- `/api/gifts/cancel` — POST
- `/api/tetris/auth/callback` — GET
- `/api/tetris/auth/credential` — GET, POST
- `/api/tetris/auth/google` — GET
- `/api/tetris/auth` — GET, POST
- `/api/tetris/cards/account` — POST
- `/api/tetris/cards/avatar` — POST, GET
- `/api/tetris/cards` — GET, PUT (compatibilité)
- `/api/tetris/gifts/extract` — POST
- `/api/tetris/gifts` — GET, POST
- `/api/tetris/leaderboard` — GET, POST
- `/api/tetris/local-scores` — POST
- `/api/tetris/profile` — GET, POST
- `/api/tetris/sessions` — POST
- `/api/track` — POST

Aucun fichier de convention sitemap ou robots détecté. Vérifier la réponse déployée et les alias lors de la recette.

## État initial des vérifications

Commandes exécutées dans une copie de travail isolée et sans fichiers `.env*`, avec Node 26.3 et les dépendances présentes.

| Contrôle | Résultat |
| --- | --- |
| Lint | 10 erreurs et 8 avertissements. Les erreurs concernent les mises à jour d’état dans des effets React et un lien HTML dans le playground. |
| Typecheck | Réussi. |
| Unitaires | 235 réussis dans les quatre scripts déclarés. Tetris 113, Burger 57, Cards 57, sécurité 8. Des unitaires colocalisés et d’autres suites racine ne sont pas inclus dans ces scripts. |
| Playwright | La découverte globale échoue notamment sur les imports `server-only`, une feuille CSS Primer et un fichier unitaire avec `import.meta`. La découverte ciblée des outils image trouve 9 tests. Le serveur local est bloqué à l’ouverture du port, y compris sur 127.0.0.1. Parcours navigateur non exécutés. |
| Build | Turbopack échoue d’abord quand les dépendances sont liées hors de la copie. Avec les dépendances copiées, Turbopack démarre sans résultat final observé. Le diagnostic Webpack échoue sur le DNS de Google Fonts pour Geist Mono, Google Sans et Noto Sans SC. |
| Knip, npm audit | Bloqués par le DNS du registre npm. |
