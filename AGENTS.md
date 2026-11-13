<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Travail sur le portfolio

1. Lire et inventorier avant toute modification. Jusqu’à la validation explicite du plan en phase 4, seuls `docs/` et `AGENTS.md` peuvent être modifiés.
2. Utiliser une branche dédiée, jamais `main`. Préserver le travail local en cours.
3. Supprimer uniquement les fichiers nommés et justifiés dans le plan validé.
4. Ne jamais lire, afficher ni committer de contenu `.env*`. Inventorier uniquement les noms de variables depuis les références dans le code.
5. Toute évolution Supabase passe par un fichier dans `supabase/migrations/`. Aucune modification directe de la base.
6. Préserver toutes les URL publiques dans les sept langues. Tout changement d’URL impose une redirection dans `next.config.ts` et des tests des anciennes URL.
7. En production, conserver le masquage de Clicker Burger et Ouverture de cartes : aucun lien, navigation, sitemap ou indexation. Le propriétaire a validé le 13 novembre 2026 leur aperçu local uniquement (`NODE_ENV=development`, hors Vercel) ; cette exception ne doit jamais les publier. Tetris et Pokémon sont les seuls jeux accessibles sur les déploiements ; Tetris reste `noindex` jusqu'à décision SEO distincte.
8. Utiliser le design system en place pour toute nouvelle primitive UI ou tout nouveau token.
9. Traduire tout nouveau texte visible en ar, de, en, es, fr, it, zh. Consigner les traductions incertaines dans `docs/i18n-review.md` et suivre les règles de synchronisation ci-dessous.
10. Rester sur Supabase Free et Vercel Hobby, sans dépendance payante ni service externe supplémentaire.
11. Tenir à jour `AGENTS.md`, source de référence des règles du dépôt.
12. Après chaque lot, vérifier lint, typecheck, build et tests. Consigner les commandes bloquées par l’environnement avec leur cause.
13. Utiliser des commits conventionnels (`chore:`, `refactor:`, `fix:`, `feat:`), un par ticket si possible.

## Agents et reprise

Suivre le [déroulé des phases 0 à 6](docs/agents/workflow.md).

Pour la refonte Tetris (audit du 13 novembre 2026), reprendre le [plan et ses audits spécialisés](docs/tetris/REFONTE_PLAN_2026-11-13.md). Le périmètre TET-01 à TET-05 est validé ; préserver le moteur classique, les replays et le masquage pendant la refonte DS/parcours.

- [Architecte](docs/agents/architecte.md) · [Back-end](docs/agents/backend.md) · [Sécurité](docs/agents/securite.md) · [Designer](docs/agents/designer.md)
- [Jeu](docs/agents/jeu.md) · [Product Manager](docs/agents/pm.md) · [Product Owner](docs/agents/po.md) · [Disruptif](docs/agents/disruptif.md)

## Commandes et design system

- `npm run dev`, `npm run build`, `npm run start`.
- `npm run lint`, `npm run typecheck`.
- `npm test` couvre le moteur Tetris et le registre des démos Playground. Compléter avec `npm run test:burger`, `npm run test:cards`, `npm run test:security` et les suites ciblées.
- `npm run test:tetris:browser` lance toutes les suites Playwright malgré son nom. `npm run test:tools` lance les tests image Chromium. Playwright attend un serveur déjà démarré.
- Les tests des parcours Liste sont dans le dépôt [mtmd-list](https://github.com/idhem-me/mtmd-list). Les démos des formulaires et du tableau du Playground restent couvertes par les tests du Portfolio.
- Primitives dans `src/components/ui`, adaptateurs dans `src/components/design-system`, tokens globaux dans `src/app/globals.css`. Consulter [la documentation existante](docs/designsystem.md), [l’inventaire](docs/design-system/inventory.md) et maintenir la vitrine `/playground` et la page de comparaison `/playground/design-systems`.
- Sobre est le style initial (identifiant interne `mehdi`). Fun, Frutiger Aero et Liquid Glass réutilisent les primitives locales et définissent leurs palettes et effets dans les feuilles de thème de `src/components/design-system/`. Sobre, Fun et Frutiger Aero sont publics ; Liquid Glass reste réservé au mode développement. Le thème global est mémorisé par navigateur. Charger sa feuille de styles et les ressources de la variante active à la sélection, à la restauration d’un choix ou au rendu d’un aperçu dédié. Laisser le navigateur demander les polices utilisées sans préchargement global. Les démos forcées du Playground et leurs portails gardent une portée locale.
- Les polices du portfolio sont hébergées localement dans `src/app/fonts/` pour que le build ne dépende pas de Google Fonts. Sobre utilise Google Sans ; Fun utilise Bricolage Grotesque ; la monospace utilise Geist Mono ; les locales arabe et chinoise gardent leurs familles dédiées avec repli système pour les glyphes absents. Le lint interdit les imports `next/font/google`. Frutiger Aero utilise Nunito Sans et des tokens `--aero-*` pour le gel, le verre, les biseaux et les champs creusés. Son fond d'accueil remplace la composition papier entière uniquement dans la portée Aero ; conserver un dégradé de repli derrière l'image locale.
- Consulter le guide du design system avant de modifier les styles globaux. Importer uniquement les composants Shadcn nécessaires et présenter chaque primitive Shadcn de `src/components/ui` avec ses variantes sur `/playground`.
- Préserver la mise en page actuelle du site avec sa barre latérale rétractable, son contenu centré (`max-w-3xl`) et ses contrastes doux.

## Couverture du Playground

- Pour tout composant créé ou modifié, utiliser les tokens du DS pour la couleur, la typographie, les espacements, les rayons et les cibles. Un nouveau token sémantique doit avoir un usage nommé et une démo qui en montre l’effet.
- Tout changement visuel du design system doit apparaître dans le Playground dans le même lot. Mettre à jour la démo réelle et son ancre pour toute primitive, variante, état ou modification de token. Présenter les compositions réutilisables avec des données fictives.
- Pour chaque contrôle autonome concerné, présenter les densités Desktop et Mobile. Le mode Auto choisit Mobile sous 768 px de viewport. Vérifier la zone d’activation mobile de 44 × 44 px CSS, y compris dans les menus et dialogues. Documenter les exceptions et vérifier le focus clavier.
- Consigner les primitives locales dans [le relevé dédié](docs/design-system/playground-local-components.md). Mettre à jour [la couverture](docs/design-system/playground-coverage.md) quand une démo ou une exception change. Garder les références aux jeux masqués dans la documentation interne.
- Réserver `/playground/local-components` et son onglet au serveur de développement local. Retirer chaque ticket de la page dès sa clôture et conserver sa résolution dans le relevé. Quand la liste est vide ou hors développement local, masquer l’onglet et rediriger l’adresse vers le catalogue de la même langue.

## Synchronisation i18n

- Après une modification de `content/fr/` ou de `messages/fr.json`, synchroniser les six autres langues dans le même changement, sauf instruction explicite de différer la traduction. Conserver chemins, clés, imbrication, structure des listes, URL, coordonnées, chemins des logos et initiales.
- Utiliser `messages/{locale}.json` pour les libellés d’interface et `content/{locale}/` pour le contenu éditorial ou structuré. Formater les métadonnées en JSON indenté entre les délimiteurs `---` des fichiers Markdown.
- Conserver les noms propres et les noms de produits. Utiliser le chinois simplifié (`zh`) et l’arabe standard moderne (`ar`).
- Limiter la synchronisation du contenu aux surfaces localisées. Une traduction de contenu ne justifie pas de modifier les routes dashboard, playground ou API.
- Mettre à jour les imports statiques de `src/i18n/messages.ts` seulement si un fichier de langue est ajouté.
