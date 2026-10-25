# Activer le classement avec votre compte Supabase

L’adaptateur Supabase est prêt ; l’interface, les pseudonymes et la vérification des scores restent identiques. Il n’est pas nécessaire de créer un compte Turso ni d’ajouter Supabase Auth aux joueurs.

## 1. Installer les tables dans le projet Supabase

Dans votre projet Supabase existant, ouvrir **SQL Editor → New query**, coller le contenu complet de :

[`supabase/migrations/202610250001_tetris_leaderboard.sql`](../../supabase/migrations/202610250001_tetris_leaderboard.sql)

Puis cliquer **Run**. Pour conserver Google déjà configuré, appliquer ensuite `202610250002_tetris_google_records.sql`, puis `202610250003_tetris_local_profiles.sql` afin d’activer les profils, les historiques privés et les avatars Google. Ces migrations ne suppriment aucun record existant. Elles peuvent être exécutées dans l’ordre depuis SQL Editor.

Les tables ont RLS activé. Les rôles navigateur `anon` et `authenticated` ne peuvent ni les lire ni appeler les fonctions. Seul le serveur Next.js, avec la clé secrète du projet, y accède. Le serveur rejoue une partie avant de soumettre un résultat ; PostgreSQL assure l’enregistrement atomique et empêche un double envoi. Les scores Google restent dans le classement public existant. Les nouveaux profils locaux et leurs parties restent dans des tables privées distinctes, hors du classement Google. La première partie guidée est conservée uniquement dans l’historique local.

## 2. Configurer Vercel

Récupérer **Project URL** et une **Secret API key** (`sb_secret_…`) dans le panneau **Connect** ou **Settings → API Keys** de Supabase. Pour un ancien projet, une clé `service_role` reste prise en charge ; la clé `anon` ou `sb_publishable_…` ne convient pas.

Dans Vercel → projet **portfolio-mehdi** → **Settings → Environment Variables**, pour **Production** :

| Variable                                | Valeur                                            |
| --------------------------------------- | ------------------------------------------------- |
| `SUPABASE_URL`                          | `https://votre-projet.supabase.co`                |
| `SUPABASE_SECRET_KEY`                   | La clé secrète Supabase, enregistrée comme secret |
| `NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD` | Modifier `false` en `true`                        |

Alternative ancienne clé : utiliser `SUPABASE_SERVICE_ROLE_KEY` au lieu de `SUPABASE_SECRET_KEY`.

Les deux variables Supabase sont exclusivement serveur : aucun préfixe `NEXT_PUBLIC_`, aucune clé dans le code, Git ou le chat. Si des variables Turso existent déjà, Supabase est prioritaire ; vous pouvez retirer celles de Turso de ce projet Vercel. Conserver les flags du jeu et du son tels quels.

## 3. Redéployer puis vérifier

Redéployer le dernier déploiement de production contenant cette adaptation, ou lancer depuis `feature/tetris-v2` à jour :

```sh
npx vercel deploy --prod --yes --archive=tgz
```

Ne pas redéployer une ancienne version de `main` sans le jeu. Le flag public nécessite un nouveau build.

Vérifier ensuite :

1. `/api/tetris/leaderboard` répond HTTP 200 avec `[]` au départ, et le bouton Classement devient actif.
2. Terminer une partie classique après la première partie guidée, puis envoyer un score avec un pseudonyme.
3. Vérifier depuis un autre téléphone que le score apparaît, puis qu’il reste présent après redéploiement.

Le classement affiche les 20 premiers records de moins de 90 jours, avec un seul record par identité Google ou navigateur invité historique. Les profils locaux sont liés au cookie HttpOnly et leurs scores ne sont pas publics. Les pauses sont permises. Aucun compte Google requis pour le profil local ; le cookie distingue les navigateurs, pas les personnes.

## Dépannage

- HTTP 404 : le flag était désactivé lors du build ; modifier la valeur puis reconstruire.
- HTTP 503 lors de la sauvegarde de profil ou d’un avatar : vérifier Project URL, Secret API key, disponibilité du projet Supabase et application des migrations 001, 002 et 003 dans cet ordre. Laisser le Data API Supabase actif pour ce backend REST/RPC.
- Une clé publique est refusée par l’adaptateur ; utiliser une clé serveur secrète.
- Si le classement est indisponible, la partie et son record local restent disponibles.
- Pour désactiver le classement, remettre son flag à false et redéployer, sans supprimer les tables.

Sans connexion à votre compte, la migration et les permissions sont testées localement avec PostgreSQL (PGlite), et l’adaptateur via le contrat REST/RPC, y compris les réponses sans contenu HTTP 204. La connexion à votre projet réel reste à vérifier après ces étapes.

Sources officielles : [clés Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [fonctions PostgreSQL](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

L’ancien adaptateur Turso reste disponible ; son [guide séparé](LEADERBOARD_TURSO_SETUP.md) est conservé pour les environnements qui l’utilisent déjà.

## Pseudo ou compte Google

Le pseudo sans compte reste le parcours de base. L’option Google, la migration complémentaire et la configuration du fournisseur sont décrites dans [le guide Google](GOOGLE_AUTH_SETUP.md). Les scores restent vérifiés côté serveur dans les deux cas.

## Confirmation des sauvegardes et profils Google

Appliquer aussi `supabase/migrations/202610250004_tetris_identity_receipts.sql` après 003 avant d’utiliser cette version. Cette migration conserve les données existantes, ajoute des confirmations privées par session/identité et permet une nouvelle tentative après une réponse réseau perdue. Les rôles navigateur n’ont aucun accès aux confirmations. Les profils Google personnalisés et les profils locaux restent séparés ; aucune fusion par pseudonyme.
