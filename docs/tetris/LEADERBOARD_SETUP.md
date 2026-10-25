# Activer le classement général sur Vercel

Le code de connexion persistante est prêt. Le classement public reste désactivé tant que la base Turso et son token ne sont pas configurés : aucune base ni souscription n’a été créée à votre place.

## 1. Créer la base dédiée

Dans [Turso](https://turso.tech/), se connecter puis créer une base libSQL dédiée, par exemple `lava-leaderboard`. Choisir le plan souhaité dans le compte ; ne pas utiliser une base contenant d’autres tables `sessions` ou `scores`.

Récupérer l’URL `libsql://…turso.io` et générer un **Database Auth Token** autorisant la lecture et l’écriture. Il s’agit du token de cette base, pas d’une clé d’administration du compte. Les tables et index sont créés automatiquement au premier accès : aucun script SQL manuel nécessaire.

Documentation : [connexion TypeScript](https://docs.turso.tech/sdk/ts/quickstart), [création du token](https://docs.turso.tech/cli/db/tokens/create).

## 2. Ajouter les variables sur Vercel

Ouvrir le projet **portfolio-mehdi**, puis **Settings → Environment Variables**. Pour l’environnement **Production** :

| Nom | Valeur |
| --- | --- |
| `TURSO_DATABASE_URL` | L’URL de la base dédiée |
| `TURSO_AUTH_TOKEN` | Le Database Auth Token, enregistré comme secret |
| `NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD` | Modifier la valeur existante `false` en `true` |

Conserver `NEXT_PUBLIC_ENABLE_TETRIS=true` et `NEXT_PUBLIC_ENABLE_TETRIS_SOUND=true`. Le son utilisateur reste Off par défaut. Les variables `TURSO_…` sont exclusivement serveur : ne jamais les préfixer par `NEXT_PUBLIC_`, les commiter ou les envoyer dans le chat.

Pour un test Preview séparé, ajouter ces variables à Preview en ciblant `feature/tetris-v2` et utiliser idéalement une base distincte. Les secrets de Production ne sont pas recopiés automatiquement vers Preview.

## 3. Reconstruire et déployer

Depuis la branche `feature/tetris-v2` à jour, lancer :

```sh
npx vercel deploy --prod --yes --archive=tgz
```

Cette commande publie le code local courant, sans fusionner ni modifier `main`. Ne pas relancer un ancien déploiement de `main`, qui ne contient pas le jeu. Le flag public est figé au build : ajouter les variables sans reconstruire ne suffit pas.

Documentation : [variables Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables).

## 4. Vérifier le résultat

1. Ouvrir `/api/tetris/leaderboard` : réponse HTTP 200 avec `[]` au départ.
2. Ouvrir `/jeux/tetris` : le bouton Classement doit être actif, avec un état vide clair.
3. La toute première partie guidée ne compte pas. Jouer une partie classique suivante, aller au game over, saisir un pseudonyme et choisir Envoyer mon score.
4. Depuis un second navigateur ou téléphone, vérifier que ce pseudonyme et son score apparaissent ; après un nouveau déploiement, ils doivent toujours être présents.
5. Vérifier qu’une nouvelle soumission de la même session est refusée et qu’une partie moins bonne n’écrase pas le record personnel.

Le classement conserve un meilleur score par navigateur, affiche les 20 premiers des 90 derniers jours et calcule le score à partir de la relecture serveur. Le cookie anonyme n’identifie pas une personne : effacer ses cookies crée une nouvelle identité. Le serveur ne détecte pas tous les bots.

## En cas d’erreur

- HTTP 404 : flag désactivé lors du build ; reconstruire avec le flag actif.
- HTTP 503 : vérifier URL, token, droits d’écriture, validité du token et état de Turso. Aucun détail de connexion ni secret n’est renvoyé au joueur.
- Le jeu solo reste jouable si la connexion au classement échoue.
- Pour désactiver le classement, remettre son flag à false puis redéployer. Ne pas supprimer la base : les records peuvent être conservés.

## Vérification effectuée sans compte Turso

L’adaptateur est testé avec libSQL sur disque temporaire, via deux connexions indépendantes : persistance, relecture, propriété de session, anti-double envoi, expiration, limitation des démarrages et record unique. Cela ne remplace pas le test de connexion à votre future base Turso. Aucune disponibilité distante n’est revendiquée avant l’étape 4.
