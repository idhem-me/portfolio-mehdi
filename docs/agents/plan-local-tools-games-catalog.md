# Plan — catalogue local des outils et jeux

## Constat

- `/outils` liste déjà les six outils actuellement présents : cinq pages locales et le service Listes de cadeaux externe.
- `/jeux` utilise `getGames()`, qui retire les entrées selon les interrupteurs Tetris, Clicker Burger et Cartes. Les jeux Tetris et Cartes sont volontairement masqués par les règles de publication du dépôt.
- Les pages Tetris et Cartes renvoient 404 lorsque leur fonctionnalité est désactivée. Elles ne doivent pas devenir navigables depuis le catalogue local.

## Périmètre proposé

- Garder `/outils` exhaustif en local ; aucune route d’outil actuelle n’est absente de sa liste. Ne pas inventer de cartes pour des outils inexistants.
- En développement local uniquement, faire apparaître dans `/jeux` toutes les entrées du catalogue de jeu, même quand leur fonctionnalité est désactivée ou leur publication fermée.
- Afficher une pastille DS `Désactivé` lorsque l’interrupteur de fonctionnalité est coupé, et `Non déployé` lorsque l’entrée est retenue par le verrou de publication.
- Rendre ces entrées locales non cliquables tant qu’elles ne sont pas publiées/actives. Conserver les liens uniquement vers les jeux réellement disponibles.
- Garder le filtrage et la navigation actuels hors développement ; ne modifier ni routes, sitemap, indexation, ni leur visibilité publique.
- Traduire les deux libellés dans les sept fichiers `messages/{ar,de,en,es,fr,it,zh}.json`, et utiliser la variante de Badge déjà tokenisée.

## Fichiers envisagés

- `src/lib/content.ts`
- `src/app/[locale]/(site)/jeux/page.tsx`
- `messages/{ar,de,en,es,fr,it,zh}.json`
- une suite ciblée de test du catalogue si la structure existante le permet

## Critères de revue

- En local, `/outils` montre tous les outils existants et `/jeux` les quatre jeux déclarés.
- Les entrées non disponibles portent une pastille de statut traduite et ne créent aucun lien vers un jeu masqué.
- Hors développement local, le contenu visible, les routes, les URL publiques, le sitemap et l’indexation gardent leur comportement actuel.
- Les pastilles utilisent les tokens du DS sans nouveau token ni couleur codée en dur.

## Vérifications prévues après validation

- Consulter les guides Next.js locaux avant les changements de code.
- Exécuter lint, typecheck, build et les tests ciblés puis vérifier localement les deux pages.
- Vérifier l’absence de changement aux URLs et au sitemap publics.

## État

Validé et implémenté. `getGames(..., { includeUnavailable: true })` renvoie les quatre entrées, avec Tetris désactivé et Cartes non déployé dans la configuration actuelle ; la page n’en fait pas des liens. Sans cette option, le filtrage existant reste actif. Les deux libellés sont synchronisés dans les sept locales. Le test ciblé du catalogue et les suites `npm test` (122 réussis), `test:burger` (57 réussis) et `test:cards` (57 réussis) passent, ainsi que lint, typecheck et le contrôle des libellés. `npm run build` reste bloqué : le barrel installé de `lucide-react@1.66.0` référence `circle-exclamation-point.mjs` et `triangle-exclamation-point.mjs`, absents du paquet même après réextraction hors ligne. Le lockfile et les manifestes n’ont pas été modifiés par cette vérification.
