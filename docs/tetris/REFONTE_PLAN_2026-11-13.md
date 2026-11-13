# Tetris — audit et proposition de refonte

Date : 13 novembre 2026. Branche : `codex/tetris-audit-refonte`.
Statut : TET-01 à TET-05 validés. Implémentation sur `codex/tetris-refonte-implementation`.

## Objectif et méthode

Rendre les couleurs cohérentes avec le design system sélectionné et rendre compréhensible la boucle accueil → partie → pause → résultat → nouvelle partie. L’orchestrateur assume PM/PO et arbitre les audits des agents jeu, designer et architecte (incluant les frontières backend/sécurité). Les audits spécialisés accompagnent ce plan dans ce dossier. L'analyse porte sur le code courant ; les anciennes captures et README ne prouvent pas le comportement actuel.

Travail local préexistant préservé : `docs/agents/plan-sidebar-nav-gap.md`, `docs/audit/analytics-seo-migration-review-2026-11-12.md`, `docs/audit/migration-mtmd.md`. Aucun fichier `.env*` lu. Aucun changement de code, de route, de base ou de dépendance.

## Inventaire utile

| Surface | Source de vérité actuelle |
| --- | --- |
| Route et masquage | `src/app/[locale]/(game)/jeux/tetris/page.tsx`, `src/features/tetris/flags.ts`, redirection historique dans `next.config.ts` |
| Moteur pur | `src/features/tetris/engine/` : pièces, génération, collisions, score, replay, ouverture guidée |
| Orchestration | `src/features/tetris/ui/tetris.tsx` : moteur, préparation asynchrone, quatre états, panneaux, inputs |
| Résultat et persistance | `ui/game-over.tsx`, `auth/draft.ts`, `profile/client-store.ts` |
| Visuel | `render/lava.ts`, `render/board.tsx`, `render/material.ts`, `ui/piece-shape.tsx`, `ui/game.css` |
| DS | `src/app/globals.css`, `src/components/design-system/{provider.tsx,design-system.css,fun.css,frutiger-aero.css,liquid-glass.css}` |
| Réglages partagés | `src/components/games/game-settings/` ; éviter de modifier les autres jeux |
| Backend existant | API Tetris, replay serveur et adaptateur Supabase ; migrations historiques conservées |
| Traductions | UI Tetris contient encore du français codé en dur ; intégrer les libellés de la surface refondue à `messages/{ar,de,en,es,fr,it,zh}.json` |
| Validation | tests moteur/stockage/replay, tests navigateur Tetris, identité et responsive ; couverture des transitions à compléter |

Noms de variables identifiés depuis les références du code, sans lecture de valeurs : `NEXT_PUBLIC_ENABLE_TETRIS`, `NEXT_PUBLIC_ENABLE_TETRIS_SOUND`, `NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `GOOGLE_CLIENT_ID`, `APPLE_AUTH_ENABLED`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `TETRIS_DB_PATH`, `VERCEL`, `NODE_ENV`. Les références Turso sont historiques ; aucune nouvelle infrastructure n'est proposée.

## Diagnostic consolidé

1. **P0 — Résultat restauré sans intention du joueur.** `tetris.tsx:199–207` restaure tout brouillon directement en `over`. `game-over.tsx:101–145` écrit ce brouillon et sauvegarde localement sans le solder ; Menu et Rejouer ne définissent pas sa clôture. Un ancien résultat peut ainsi réapparaître. Ne pas simplement supprimer tous les brouillons : certains contiennent encore un envoi à récupérer.
2. **P0 — Transitions dispersées.** La préparation réseau de `start()` peut se terminer après un retour au menu. Des boutons de pause restent montés derrière le résultat ; il faut rendre impossible une reprise du moteur terminé et isoler le focus. Voir audit architecture pour les transitions exactes.
3. **P1 — Sauvegarde peu lisible.** Le succès d’envoi est masqué par `message && !sent` dans `game-over.tsx:259`. Les comptes connectés ont un envoi volontaire, contrairement à certaines descriptions historiques d’autosauvegarde. Distinguer explicitement sauvegarde sur appareil et enregistrement en ligne, sans publication implicite.
4. **P1 — Couleurs indépendantes du DS.** `game.css:4–30` fixe les sept couleurs ; `lava.ts:127–141` invalide la palette sur `html.className`, tandis que le provider modifie `data-design-system`. Une simple substitution de variables ne suffit pas.
5. **P1 — Hiérarchie du résultat.** Quatre à cinq actions rivalisent, et les lignes, le niveau et la durée disponibles dans `GameSummary` sont omis. Le titre focalisable ne reçoit pas automatiquement le focus.

## Expérience proposée

| État | Présentation et actions | Règle de sortie |
| --- | --- | --- |
| Accueil | Jouer ; réglages/règles secondaires ; éventuel score en attente dans un encart discret | Un seul démarrage accepté |
| Préparation | Retour visuel immédiat sur Jouer ; annulation cohérente | Une réponse tardive ne peut pas démarrer après annulation |
| Partie | Plateau, réserve/suivantes, score/lignes/niveau ; pause accessible | Masquage onglet → pause ; fin moteur → résultat immuable |
| Pause | Reprendre en primaire ; réglages et Retour à l’accueil secondaires | Jamais accessible depuis un résultat ; confirmation si abandon d’une partie en cours |
| Résultat | « Partie terminée », score, record personnel, lignes, niveau, durée ; Rejouer en primaire, Retour à l’accueil en secondaire | Nouvelle session créée une fois ; résultat précédent conservé indépendamment si envoi en attente |

Le classement reste un lien secondaire seulement lorsqu’il est disponible. La sortie vers les jeux reste accessible depuis l’accueil ; inutile de répéter Menu et Quitter dans le pied du résultat. Une pause et un résultat doivent rendre les contrôles du plateau inactifs au pointeur et au clavier. Utiliser les primitives existantes quand une modale est nécessaire ; ne pas forcer un écran de résultat à se comporter comme un overlay non modal.

La sauvegarde a ses propres états : locale en cours / enregistrée / impossible ; en ligne disponible / en cours / envoyée / à réessayer / identité requise. Une erreur ne bloque jamais Rejouer. Un succès local ne vaut pas confirmation serveur. Un ancien résultat consulté ne doit pas réapparaître automatiquement ; un envoi réellement en attente reste récupérable, lié à son identité d’origine. Ne pas écraser un envoi en attente lors de la partie suivante ; borner et tester la conservation, sans nouvelle table ni service.

## Contrat visuel proposé

- Conserver les sept rôles `--tetris-piece-{i,j,l,o,s,t,z}` pour éviter une migration inutile ; les définir dans les palettes du DS et les consommer dans le jeu sans valeurs hex locales prioritaires.
- Garder une identité stable par pièce au sein de chaque thème : pièce active, réserve, prochaines pièces, cellules posées et couverture utilisent la même source. Les couleurs ne remplacent jamais la géométrie comme indice.
- Sobre : palette modérée et relief discret ; Fun : saturation et contrastes plus francs ; Aero : palette lumineuse et matière gel/verre issue de ses tokens ; Glass : traitement de verre en développement uniquement. Les valeurs finales doivent être validées visuellement en clair/sombre.
- Couleurs du plateau, grille, fantôme, reflets et intensité de matière doivent dériver des tokens existants ou de tokens dédiés documentés. Ne pas faire dépendre arbitrairement les sept pièces des cinq couleurs de graphiques.
- Résoudre les couleurs calculées au niveau du canvas, y compris `oklch()` et `color-mix()`. Invalider après chargement de la feuille, changement du DS, du mode clair/sombre et d’une portée locale. Repeindre aussi à l’arrêt/pause, sans nouvelle session ni remise à zéro du moteur et sans lecture de style à chaque frame.
- Même intention visuelle en WebGL et SVG, sans exiger une identité pixel à pixel des deux technologies.
- Préserver la recoloration des masses connectées déjà présente dans `engine/game.ts:182–196`. L’identité stable concerne le rôle de couleur résolu, pas la conservation de la couleur d’origine d’une cellule après cette fusion. Aucun changement du moteur, de gravité ou de scoring dans le socle.
- Playground : montrer les nouveaux rôles sous une démo générique de palette/matière et de contrôles réutilisables, sans titre, lien ou référence publique aux jeux cachés. Garder la référence au consommateur Tetris dans la documentation interne.

## Backlog proposé à validation

Efforts relatifs : S = petit changement ciblé ; M = plusieurs composants/tests ; L = changement transversal. Les lots restent séquentiels là où les fichiers sont partagés.

| Ticket | Priorité / effort / responsable | Périmètre et dépendances | Critères d’acceptation |
| --- | --- | --- | --- |
| TET-01 Transitions explicites | P0 / M / architecte + jeu | `ui/tetris.tsx`, nouveau contrôleur local à la feature si utile ; tests ciblés | préparation annulable, double clic idempotent, `over` ne redevient pas pause/jeu, perte visibilité sûre, aucune action derrière le résultat |
| TET-02 Résultat et conservation | P0 / L / architecte + designer | après TET-01 ; `ui/game-over.tsx`, `auth/draft.ts`, `profile/client-store.ts`, tests identité | résultat complet, Rejouer prioritaire, succès/échec explicites, refresh après Menu cohérent, envois conservés entre parties, aucun changement d’attribution de compte, aucun envoi implicite |
| TET-03 Palette et matière DS | P1 / M / designer + architecte | tokens globaux/thèmes, `ui/game.css`, `render/{lava,board,material}`, `ui/piece-shape.tsx`, couverture si nécessaire | quatre thèmes dont Glass dev, clair/sombre ; couleurs mises à jour en jeu et en pause sans reset ; WebGL/SVG/réserve/couverture cohérents ; scopes forcés isolés |
| TET-04 Ergonomie et i18n | P1 / M / designer + jeu | avec chaque ticket UI ; `messages/{locale}.json`, UI Tetris concernée | focus résultat/reprise, clavier, cibles mobiles 44×44, petits écrans/paysage, arabe RTL hors géométrie du plateau, chinois, motion réduite ; aucun nouveau libellé non traduit |
| TET-05 Couverture et documentation | P1 / M / PO + architecte | même lot que les changements ; tests et docs DS/Tetris/AGENTS | matrice ci-dessous, démos génériques et registres à jour, README débarrassé des descriptions obsolètes concernant le parcours modifié |
| TET-06 Twist optionnel | P2 / à préciser / jeu | décision séparée après audit ; ne bloque pas TET-01 à 05 | aucune incidence sur classements, replays ou résultats historiques du mode classique |

Aucune suppression ni déplacement de fichier proposé. Ajouts limités aux contrôleurs/tests/démos nécessaires dans les répertoires cités ; ne pas réorganiser tout le moteur. Aucun changement API/migration attendu. Toute nécessité de modifier le protocole des scores ou le schéma impose une révision du plan ; une évolution Supabase passerait exclusivement par une migration.

## Challenges créatifs et arbitrage PM/PO

Les cinq propositions du [game designer](audit-2026-11-13-game-design.md) reçoivent les arbitrages suivants. Elles restent sans service supplémentaire, compatibles avec les offres gratuites.

| Proposition | Effort | Arbitrage et justification |
| --- | --- | --- |
| Objectif personnel facultatif pour la prochaine partie | S | Recommandé en option après le socle : prochain palier de lignes ou record personnel, sans bonus, pression ni modification des scores. Ajoute une intention à Rejouer. |
| Fusion comme signature visuelle du thème | M | Garder la fusion existante dans le socle. Reporter toute amplification ; palette lisible d’abord, effets plus marqués seulement après recette GPU/motion réduite. |
| Sprint 40 lignes local | M | Meilleur candidat pour un véritable nouveau mode : objectif fini et victoire possible. Hors socle, records distincts et aucun envoi au classement classique. |
| Atelier détente | M | Reporter ; un tutoriel court explicite serait un investissement plus ciblé. Ne pas modifier silencieusement la première partie guidée dans ce lot. |
| Puzzle quotidien déterministe | L | Écarter du lot : production/validation des puzzles et nouveaux parcours dépassent la correction demandée. |

L’onboarding automatique, les gestes et la difficulté ont été audités ; leur refonte reste une piste secondaire, à valider séparément après correction du flow. L’intensité de matière peut être ajustée aux thèmes dans TET-03, sans créer de nouvelle animation ni changer la fusion.

## Validation prévue à l’implémentation

- Tests de transition : double Jouer, Menu pendant préparation, résultat → Rejouer, résultat → accueil → refresh, pause → réglages → pause → reprise, focus et raccourcis derrière panneaux.
- Tests de conservation : appareil indisponible/quota, session hors ligne, succès/échec réseau, retry, deux parties avec première en attente, changement d’identité, brouillon expiré, partie guidée et score non classable. Les mocks auth ne certifient pas le fournisseur réel.
- Tests DS : sélection et restauration différée de chaque thème, clair/sombre, portée locale forcée, plateau actif et arrêté, SVG forcé et perte WebGL. Mesurer contraste des textes/contrôles et visibilité de grille/ghost/pièces.
- Navigateur : Chromium et WebKit iPhone ; Android émulé ciblé ; 320 px, 375 px, desktop, paysage ; sept langues sur surfaces refondues. Conserver les tests de flags, noindex et anciennes URLs ; aucune nouvelle indexation ni lien de découverte.
- Après chaque lot : `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, suites navigateur ciblées ; suites partagées burger/cards/security selon impact et contrôles requis du dépôt. Compte rendu des blocages réels.

## Vérifications de cet audit

- `npm test` : 115 tests réussis, 0 échec.
- `npm run lint` : réussi.
- `npx tsc --noEmit --incremental false` : réussi, contrôle sans fichier incrémental généré.
- `npm run typecheck` exact et `npm run build` : différés jusqu’à validation ; `next typegen` et le prébuild peuvent écrire hors `docs/`. Ce n’est pas un échec constaté de ces commandes.
- Tests navigateur non exécutés : aucun serveur à `localhost:3000` ; aucun serveur démarré pendant cette phase documentaire. Les constats de parcours sont étayés par le code, mais pas encore reproduits dans une session navigateur courante.
- Des tests navigateur d’identité attendent encore l’ancien formulaire/pseudo et l’envoi automatique. Les 115 tests réussis ne certifient donc pas les parcours navigateur ; TET-05 doit réaligner ces assertions sur le contrat validé et ajouter les régressions, sans les supprimer pour rendre la suite verte.
- Guide Next installé consulté : `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` ; aucune modification de code pendant cet audit.

## Décision de phase 4

Le propriétaire a validé TET-01 à TET-05 pour la refonte du parcours classique et de ses tokens. Le twist reste une proposition séparée. Cette étape est imposée par `AGENTS.md` et `docs/agents/workflow.md`, phase 4 : « Attendre la validation explicite du propriétaire. »

## Recette d’implémentation

- `npm test` : 121 tests réussis, dont la conservation des scores en attente.
- `npm run lint` et `npm run typecheck` : réussis.
- `npm run build` : réussi dans une copie de recette sans fichiers d’environnement, avec les flags Tetris injectés à la commande.
- Chromium : résultat et focus, échec d’envoi et récupération après rechargement, annulation de la relance asynchrone, repli SVG, mouvement réduit et trois palettes restaurées.
- L’authentification et les envois de la recette navigateur utilisent des réponses simulées. La matrice visuelle exhaustive, les suites navigateur historiques d’identité et l’authentification réelle ne font pas partie de ces vérifications.
