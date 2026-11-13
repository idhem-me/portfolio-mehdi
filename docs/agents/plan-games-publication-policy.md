# Plan — accès local et publication des jeux

Date : 13 novembre 2026.
Statut : validé et implémenté le 13 novembre 2026.

## Demande

- En développement local, pouvoir ouvrir les jeux non déployés depuis le catalogue pour les modifier.
- En production, rendre accessibles uniquement Tetris et Pokémon.
- Garder Clicker Burger et Ouverture de cartes non déployés.

## Inventaire et preuves

- Le catalogue contient Pokémon, Clicker Burger, Tetris et Ouverture de cartes dans `content/{locale}/jeux.md`.
- Les changements locaux non validés ajoutent déjà les quatre cartes au catalogue en développement, mais les cartes indisponibles restent des `div` non cliquables. La demande nécessite des liens locaux vers leurs routes.
- Tetris dépend de `NEXT_PUBLIC_ENABLE_TETRIS` et sa route, son proxy et ses API renvoient 404 quand le flag est désactivé. `tetrisPublic` pilote le `noindex`, séparément de l'accès.
- Clicker Burger est actuellement actif et publié ; sa route, le catalogue et le sitemap peuvent donc l'exposer en production.
- Cartes est masqué par `cardsVisible = false` sur `/jeux/cards`, mais les pages `/boutique` et l'alias `/cards` ne sont pas toutes protégées de façon cohérente. `src/proxy.ts` couvre `/jeux/cards` et `/cards`, pas `/boutique`.
- Pokémon est déjà une route du catalogue et du sitemap.
- Les chemins publics existants sont localisés dans les sept langues. Aucun changement de route ou d'URL n'est proposé ; aucune redirection n'est donc requise.
- Aucun fichier `.env*` n'a été lu. Les noms de variables concernés sont relevés dans le code : `NEXT_PUBLIC_ENABLE_TETRIS`, `NEXT_PUBLIC_ENABLE_CARDS`, `VERCEL`, `NODE_ENV`.

## Comportement proposé

1. En environnement de développement local uniquement (`NODE_ENV=development` et hors Vercel), le catalogue `/jeux` conserve les quatre entrées et rend chaque jeu ouvrable, même lorsque sa publication ou son activation est coupée. Les badges déjà traduits indiquent les jeux désactivés ou non déployés. Pokémon reste ouvrable.
2. La même ouverture locale est permise par URL directe pour les routes de jeu, uniquement avec `NODE_ENV=development` et hors Vercel. Elle ne change pas les contrôles de publication de production ni les API de jeu ; les fonctions réseau désactivées peuvent rester indisponibles localement, et Tetris conserve son mode hors ligne.
3. En production, Tetris et Pokémon sont présents dans `/jeux` et leurs pages sont accessibles. Clicker Burger et Cartes renvoient 404 sur toutes leurs routes et alias, y compris `/boutique` et `/cards`; aucune page, entrée de navigation, sitemap ou indexation ne les expose.
4. Le catalogue de production contient donc Tetris et Pokémon uniquement. Aucun nouveau texte visible n'est requis ; les deux badges locaux sont déjà synchronisés dans les sept locales dans les changements de travail présents.
5. Conserver `noindex` pour Tetris tant qu'une décision SEO distincte n'est pas prise. Son accessibilité et sa découvrabilité dans le catalogue ne l'obligent pas à être indexé.

## Fichiers envisagés

- `src/features/tetris/flags.ts`
- `src/features/clicker-burger/flags.ts`
- `src/features/cards/flags.ts`
- `src/lib/content.ts`
- `src/app/[locale]/(site)/jeux/page.tsx`
- `src/proxy.ts`
- pages de jeu Tetris, Clicker Burger et Cartes, et `src/app/[locale]/(game)/boutique/page.tsx`
- `src/app/sitemap.ts`
- tests ciblés de politique d'accès, catalogue, alias et sitemap
- mise à jour de `AGENTS.md` et de ce relevé après implémentation

Aucun changement de contenu localisé, de schéma Supabase, de dépendance, de route ou de redirection n'est prévu. Aucun fichier n'est à supprimer.

## Critères d'acceptation

- En local, les quatre cartes mènent à leurs routes respectives, même pour les jeux non déployés ; les routes directes fonctionnent pour modification.
- En production, le catalogue ne propose que Tetris et Pokémon ; leurs routes sont accessibles.
- En production, Clicker Burger, Cartes, `/cards` et `/boutique` ne rendent aucun jeu et renvoient 404, pour chacune des sept locales.
- Sitemap et métadonnées n'exposent pas les deux jeux non déployés ; Tetris garde `noindex`.
- Aucun changement des URL publiques existantes ; conserver les anciennes URL et toutes les locales.
- Les états du catalogue local restent traduits et utilisent la primitive Badge du design system.

## Vérifications après validation

- Consulter les guides Next.js installés pertinents avant toute édition de code.
- Vérifier la matrice local/production pour le catalogue, routes directes, alias, sitemap et métadonnées, sans lire de valeurs `.env*`.
- Après le lot : lint, typecheck, build et suites de tests pertinentes. Consigner les commandes bloquées par l'environnement.
- Vérifier le diff consolidé en préservant les modifications locales préexistantes.

## Décision phase 4

Validé explicitement le 13 novembre 2026 : seuls Tetris et Pokémon doivent être accessibles sur les déploiements. Clicker Burger et Ouverture de cartes restent disponibles en aperçu local uniquement. Le catalogue local affiche l'état des jeux non publiés pour faciliter le travail ; leurs routes ne sont jamais accessibles sur Vercel. Le bouton de connexion global du catalogue est retiré, tandis que le compte facultatif interne à Tetris est conservé. Tetris reste `noindex` conformément au plan TET-01 à TET-05.

## État d'implémentation

- Lint, typecheck et build validés. Suites générales (122), Burger (57), Cartes (57) et sécurité (8) réussies.
- Le serveur de développement existant sur le port 3000 ne répondait pas dans le délai de recette. Un second serveur dans la même copie est bloqué par le verrou Next.js ; utiliser une copie isolée pour l’aperçu.
