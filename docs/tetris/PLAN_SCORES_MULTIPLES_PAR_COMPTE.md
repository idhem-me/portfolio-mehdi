# Tetris — plusieurs scores par compte

Date : 13 novembre 2026
Statut : validé et implémenté le 13 novembre 2026.

## Demande

Permettre à un compte connecté d’enregistrer plusieurs parties Tetris, au lieu de ne conserver qu’un meilleur score public par compte.

## Inventaire et diagnostic

- Le serveur vérifie chaque replay et appelle un adaptateur commun à Supabase, SQLite et Turso.
- `tetris_scores` et les tables `scores` SQLite/Turso ont `owner` comme clé primaire. Les migrations Supabase font un `ON CONFLICT(owner)` qui ne remplace le record que si le nouveau score est meilleur.
- Le classement public lit au plus 20 lignes sur les 90 derniers jours. Il ne retourne donc actuellement qu’une ligne par propriétaire.
- Les sessions et reçus rendent chaque envoi vérifié et idempotent. Les historiques `tetris_local_scores` et `tetris.local-scores.v2` sont des historiques privés/sur appareil distincts du classement public.
- La route POST calcule un rang par propriétaire après l’envoi. Il faudra le calculer pour la partie envoyée quand un compte peut avoir plusieurs rangs.
- Le composant de classement affiche déjà « Les 20 meilleurs scores » ; une même personne pourra apparaître plusieurs fois.

Sources vérifiées : `src/features/tetris/server/{store,remote-store,supabase-store}.ts`, `src/app/api/tetris/leaderboard/route.ts`, `src/features/tetris/ui/leaderboard.tsx`, `supabase/migrations/202610250001_tetris_leaderboard.sql` à `202610250004_tetris_identity_receipts.sql`, et les tests sous `src/features/tetris/engine/`.

## Comportement proposé

1. Toute partie classique admissible et vérifiée envoyée depuis un compte Google ou Apple devient une entrée indépendante, même si son score est inférieur au précédent.
2. L’interface conserve le classement général des 20 meilleurs résultats distincts sur 90 jours. Un compte peut occuper plusieurs rangs. Les profils, pseudonymes et avatars restent ceux du compte vérifié.
3. Le classement et les parcours invités gardent leur comportement actuel, dont le meilleur record par identité invitée. Les scores locaux gardent leur stockage privé actuel.
4. Un renvoi du même résultat reste idempotent grâce aux reçus. Le rang retourné après envoi correspond à cette partie, pas au meilleur score du compte.
5. L’historique public reste soumis à la rétention de 90 jours. Aucune page, route publique ou URL nouvelle n’est ajoutée.

## Plan d’exécution proposé

| Ticket | Effort | Périmètre indicatif | Critères d’acceptation |
| --- | --- | --- | --- |
| SCORES-01 Modèle et migration | M | Nouvelle migration Supabase uniquement dans `supabase/migrations/`; adaptateurs `store.ts`, `remote-store.ts`, `supabase-store.ts`; tests backend | Chaque résultat de compte a une clé unique de partie ; les anciens records sont conservés et intégrés comme entrées historiques ; un nouvel envoi inférieur est ajouté ; un retry ne crée pas de doublon ; RLS/grants et vérification serveur restent stricts ; les trois adaptateurs ont le même comportement. |
| SCORES-02 Rang et affichage | S/M | Route `/api/tetris/leaderboard`, contrat de lecture, `ui/leaderboard.tsx`, tests de route/UI ciblés | Le GET renvoie les 20 meilleurs résultats distincts et permet des doublons de joueur ; le POST retourne le rang du résultat soumis ; l’affichage conserve l’ordre et des clés de ligne stables ; aucun texte visible nouveau non traduit. |
| SCORES-03 Compatibilité et documentation | S | Documentation Tetris et tests d’intégration historiques | Les visiteurs invités gardent le meilleur record ; reçus/idempotence, limite de 90 jours, top 20 et anciennes URL restent vérifiés ; guide Supabase indique la migration à appliquer après les migrations existantes. |

Aucun fichier ne sera supprimé ou déplacé. La migration proposée ajoutera une table d’historique et de nouvelles fonctions RPC plutôt que de supprimer/remplacer la table actuelle : elle préservera les records et fonctions nécessaires à la compatibilité. Toute conversion ou suppression de schéma supplémentaire nécessitera une révision du plan. Aucune modification directe de Supabase ne sera faite. Aucun nouveau service ni coût n’est proposé.

## Risques et décisions

- **Visibilité** : ce plan considère que les scores multiples d’un compte sont des entrées publiques du classement général, comme le record actuel. Si la demande vise seulement un historique privé de compte, l’UI et la politique de publication doivent être définies autrement avant l’implémentation.
- **Ancien score** : le meilleur record déjà sauvegardé sera conservé dans l’historique au déploiement ; il ne sera pas perdu ni artificiellement dupliqué lors des reprises.
- **Limite du classement** : conserver le top 20 implique qu’un score peut être enregistré durablement dans l’historique mais ne pas apparaître dans le classement public.
- **Rétention** : conserver la règle actuelle de 90 jours pour l’affichage et le nettoyage de l’historique classé.
- **Compatibilité backend** : la migration SQL ne couvre que Supabase ; les adaptateurs SQLite et Turso devront partager la sémantique sans exposer de clé privée.
- **Sécurité** : ne jamais accepter un score fourni sans replay vérifié, ni dériver l’identité de compte depuis le corps de requête. Les RPC restent réservées au serveur et la politique RLS demeure active.
- **Portée publique** : préserver les routes Tetris, les sept langues et les règles de masquage existantes ; aucun lien ni indexation de jeu masqué ne sera ajouté.

## Validation de phase 4

Plan validé explicitement par le propriétaire avec la demande « implémente ce plan. commit et push ». Les résultats multiples d’un compte apparaissent individuellement dans le classement public. Le guide Next.js installé a été lu avant le code ; les lots sont mis en œuvre dans l’ordre.

## Recette d’implémentation

- `npm test` : 123 tests réussis, dont les adaptateurs SQLite, libSQL et Supabase, l’idempotence des reçus, le classement multiple et la migration PGlite rejouée deux fois.
- `npm run lint`, `npm run typecheck` et `npm run build` : réussis.
- Playwright Chromium ciblé : un résultat avec deux scores du même joueur s’affiche sur deux lignes distinctes.
- `npm run test:security` : 8 tests réussis ; les accès navigateur à l’historique et à la RPC sont aussi refusés dans le test de migration.
- La CLI Supabase n’est pas installée dans l’environnement (`supabase: command not found`, aucun binaire local). La migration horodatée suit le format existant et a été exécutée dans le test PostgreSQL PGlite. Aucun changement n’a été appliqué à un projet Supabase distant ; appliquer le fichier `202611130001_tetris_multiple_account_scores.sql` après les migrations précédentes avant d’activer la nouvelle version côté production.
