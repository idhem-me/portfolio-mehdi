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
7. Conserver le masquage des deux jeux cachés. Aucun lien, navigation, sitemap ou indexation. Le mécanisme nécessite une validation explicite pour évoluer.
8. Utiliser le design system en place pour toute nouvelle primitive UI ou tout nouveau token.
9. Traduire tout nouveau texte visible en ar, de, en, es, fr, it, zh. Consigner les traductions incertaines dans `docs/i18n-review.md`. Conserver les règles Cursor de synchronisation.
10. Rester sur Supabase Free et Vercel Hobby, sans dépendance payante ni service externe supplémentaire.
11. Enrichir AGENTS.md et les règles Cursor en conservant leur contenu. Lors de la pérennisation, AGENTS.md devient la référence et Cursor y renvoie ou reste synchronisé.
12. Après chaque lot, vérifier lint, typecheck, build et tests. Consigner les commandes bloquées par l’environnement avec leur cause.
13. Utiliser des commits conventionnels (`chore:`, `refactor:`, `fix:`, `feat:`), un par ticket si possible.

## Agents et reprise

Suivre le [déroulé des phases 0 à 6](docs/agents/workflow.md).

- [Architecte](docs/agents/architecte.md) · [Back-end](docs/agents/backend.md) · [Sécurité](docs/agents/securite.md) · [Designer](docs/agents/designer.md)
- [Jeu](docs/agents/jeu.md) · [Product Manager](docs/agents/pm.md) · [Product Owner](docs/agents/po.md) · [Disruptif](docs/agents/disruptif.md)

## Commandes et design system

- `npm run dev`, `npm run build`, `npm run start`.
- `npm run lint`, `npm run typecheck`.
- `npm test` couvre le moteur Tetris. Compléter avec `npm run test:burger`, `npm run test:cards`, `npm run test:security` et les suites ciblées.
- `npm run test:tetris:browser` lance toutes les suites Playwright malgré son nom. `npm run test:tools` lance les tests image Chromium. Playwright attend un serveur déjà démarré.
- Primitives dans `src/components/ui`, adaptateurs dans `src/components/design-system`, tokens globaux dans `src/app/globals.css`. Consulter [la documentation existante](docs/designsystem.md), [l’inventaire](docs/design-system/inventory.md) et maintenir les vitrines `/playground` et `/playground/design-systems`.
