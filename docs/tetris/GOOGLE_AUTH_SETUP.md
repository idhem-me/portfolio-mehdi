# Classement : pseudo ou Google

Le pseudo reste disponible sans compte. Google est optionnel : seul le serveur valide la session Supabase ; l’adresse e-mail n’est jamais affichée dans le classement. Le joueur peut modifier le nom public avant l’envoi. Choisir « Avec un pseudo » ignore volontairement le compte Google pour ce score.

## 1. Migration complémentaire

Dans le SQL Editor du projet Supabase où la première migration Tetris est déjà appliquée, exécuter :

[`supabase/migrations/202610250002_tetris_google_records.sql`](../../supabase/migrations/202610250002_tetris_google_records.sql)

Cette fonction permet au serveur d’associer un score au compte Google tout en vérifiant la propriété de la session de jeu initiale. Elle est réservée à service_role. Le parcours pseudo continue de fonctionner avec la migration originale ; aucun ancien score anonyme n’est automatiquement rattaché à un compte.

## 2. Activer Google dans Supabase

Dans Supabase → **Authentication → Sign In / Providers → Google**, activer Google et suivre l’assistant pour renseigner un **Client ID** et un **Client Secret** d’une application OAuth Web Google Cloud.

Dans Google Cloud, utiliser comme **Authorized redirect URI** l’URL de callback indiquée par Supabase, de la forme :

```text
https://IDENTIFIANT-DU-PROJET.supabase.co/auth/v1/callback
```

Ne pas y substituer le callback du portfolio. Si l’application Google est en mode Testing, ajouter les comptes test dans Google Cloud ; pour ouvrir la connexion à tous, terminer les réglages de publication Google nécessaires à votre application.

## 3. Autoriser le retour vers le jeu

Dans Supabase → **Authentication → URL Configuration → Redirect URLs**, ajouter exactement :

```text
https://portfolio-mehdi-nu.vercel.app/api/tetris/auth/callback
http://localhost:3000/api/tetris/auth/callback
```

Ajouter aussi le callback exact d’un domaine personnalisé si vous jouez via celui-ci. Ne pas utiliser un wildcard global.

## 4. Variable Vercel

Ajouter dans Vercel → portfolio-mehdi → Environment Variables → Production :

```text
SUPABASE_PUBLISHABLE_KEY = votre clé sb_publishable_…
```

Cette clé est la clé publique du projet, différente de `SUPABASE_SECRET_KEY` (clé serveur du classement). L’application l’utilise ici uniquement sur le serveur pour le flux OAuth. Les anciennes clés `anon` peuvent être placées dans `SUPABASE_ANON_KEY` à la place. Conserver `SUPABASE_URL` et `SUPABASE_SECRET_KEY` existantes.

Redéployer la dernière version de `feature/tetris-v2`. Le bouton Google reste désactivé tant que cette configuration n’est pas disponible. Aucune configuration Google Cloud ou Supabase distante n’est prétendue faite automatiquement.

## Parcours attendu

- Ouvrir Classement, ou terminer une partie classique jusqu’au nouvel écran **Game over**.
- Choisir **Avec un pseudo**, saisir le pseudonyme puis Valider ; aucun compte nécessaire.
- Ou choisir **Avec Google**. La redirection utilise PKCE ; au retour, une partie terminée est restaurée avec son score et le pseudonyme saisi. Puis confirmer le nom public et envoyer le score.
- Le record Google est associé au même compte sur plusieurs appareils. Le record invité reste associé au navigateur.
- La connexion ne publie jamais de score automatiquement. La première partie guidée reste hors classement.

## Isolation et vérification

Cookies HttpOnly/SameSite Lax limités à `/api/tetris`, client Supabase créé par requête, rafraîchissement via les Route Handlers du jeu uniquement. Aucun provider global ni middleware d’authentification ajouté au portfolio. Le serveur appelle `getUser()` pour valider une identité Google avant d’attribuer un record ; il n’accepte pas un identifiant de compte envoyé par le navigateur.

Les tests exécutent les fonctions PostgreSQL et simulent le retour OAuth dans Chromium, Chrome Android émulé et WebKit iPhone. Une connexion réelle à Google doit être vérifiée une fois ces paramètres configurés ; aucune session Google personnelle n’est utilisée par les tests automatisés.

Source : [documentation officielle Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Parcours courant — bouton officiel GIS

Les paragraphes historiques concernant la confirmation manuelle après connexion sont remplacés par ce parcours : le profil Google est reconnu directement et la partie admissible en attente est enregistrée automatiquement. Le choix pseudo au Game over crée maintenant un profil local privé persistant, puis enregistre cette partie et les suivantes automatiquement.

1. Conserver le fournisseur Google, le Client ID et le Client Secret existants dans Supabase.
2. Configurer côté application `GOOGLE_CLIENT_ID` avec **ce même Client ID Web** (identifiant public, jamais le Client Secret).
3. Dans Google Cloud → client OAuth existant → Authorized JavaScript origins, ajouter les origines exactes utilisées, par exemple `http://localhost:3000` et le domaine HTTPS du site. Un test sur le port 3001 nécessite son origine exacte. Le callback Supabase existant reste inchangé.
4. Appliquer les migrations 001, 002, 003 puis `202610250004_tetris_identity_receipts.sql`.
5. Vérifier une vraie connexion desktop/mobile, la fermeture de la fenêtre Google, les erreurs et la nouvelle tentative. Ne pas désactiver la vérification du nonce dans Supabase.

`google.accounts.id.renderButton` dessine le bouton officiel. `/api/tetris/auth/credential` prépare le nonce puis échange le jeton Google via le client Supabase SSR existant. La session conserve ses cookies HttpOnly ; aucun nouveau système d’authentification n’est créé. Le profil applicatif utilise le nom et l’avatar Google comme valeurs initiales et garde ses personnalisations en base, sans modifier le compte externe.

Une fermeture de fenêtre n’efface ni le score ni le pseudo ; aucune obligation d’identification pour jouer. Le brouillon n’est supprimé qu’après confirmation de sauvegarde (ou exclusion de la partie guidée Google), avec une validité de 24 h alignée sur la session serveur.
