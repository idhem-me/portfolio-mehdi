# Sauvegarde Cartes avec Google ou Apple

## Configuration du projet Supabase existant

Le projet Vercel lié est `portfolio-mehdi`. Les variables Supabase de production existent, mais Vercel interdit l’export de celles marquées sensibles. Ne copier ni clés ni tokens dans une conversation.

Dans `.env.local`, renseigner les valeurs du même projet Supabase :

```dotenv
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

La clé publiable peut être remplacée par l’ancienne `SUPABASE_ANON_KEY` et la clé serveur par `SUPABASE_SERVICE_ROLE_KEY` si le projet utilise ces noms. La clé serveur ne doit jamais porter un préfixe `NEXT_PUBLIC_`.

1. Dans le SQL Editor Supabase du projet existant, exécuter `supabase/migrations/202610270001_cards_progress.sql`. Cette migration ajoute seulement la table privée `cards_progress` ; elle ne modifie pas Tetris ni les comptes existants.
2. Dans Authentication > Providers, conserver/activer le fournisseur Google existant.
3. Dans la liste des redirect URLs autorisées par Supabase, ajouter `http://localhost:3000/api/tetris/auth/callback` pour le Mac. Le callback Google OAuth auprès de Google reste celui de Supabase (`https://<projet>.supabase.co/auth/v1/callback`), pas l’adresse locale du Mac.
4. Pour tester aussi Google depuis un iPhone sur le réseau local, autoriser dans Supabase le callback correspondant à l’adresse du Mac (actuellement `http://192.168.1.12:3000/api/tetris/auth/callback`). Les cookies sont HttpOnly et leur périmètre reste `/api/tetris`. Si le fournisseur impose HTTPS sur cet environnement, utiliser une URL de preview HTTPS autorisée au lieu de contourner une alerte de certificat.
5. Relancer `npm run dev`. Le script écoute explicitement sur `0.0.0.0` pour permettre les tests sur le réseau local.

## Activer Apple

La connexion Apple réutilise le callback de l’application (`/api/tetris/auth/callback`) et ne nécessite pas de migration SQL. Chaque fournisseur crée son propre compte Supabase; les données Google ne sont pas fusionnées automatiquement avec un compte Apple portant la même adresse.

1. Dans Apple Developer, crée un App ID avec la capacité « Sign in with Apple », puis un Services ID associé et une clé privée Sign in with Apple (`.p8`). Ajoute le domaine de ton projet Supabase et le callback `https://<projet>.supabase.co/auth/v1/callback` aux réglages Apple.
2. Dans Supabase > Authentication > Providers > Apple, active le fournisseur et renseigne le Services ID et le secret client JWT généré avec le Team ID, le Key ID et la clé `.p8`. Garde la clé privée et le secret dans les champs sécurisés du fournisseur; ne les ajoute pas aux fichiers du dépôt.
3. Dans Supabase > Authentication > URL Configuration, autorise `http://localhost:3000/api/tetris/auth/callback` et les callbacks HTTPS de preview/production utilisés par le site.
4. Définis `APPLE_AUTH_ENABLED=true` dans l’environnement du site seulement une fois le fournisseur configuré dans Supabase. La valeur par défaut reste `false`, ce qui laisse le bouton Apple désactivé.
5. Apple OAuth web ne fournit pas le nom complet. Le compte reste utilisable avec un nom générique si Apple ne renvoie pas de nom.

Le secret client Apple doit être renouvelé tous les six mois. Programme son renouvellement dans Apple Developer et mets à jour le secret dans Supabase avant son expiration.

## Comportement

- La bannière apparaît à partir de trois boosters finalisés et peut être masquée durablement avec « Continuer sur cet appareil ».
- Les CTA Google et Apple utilisent les boutons et l’authentification partagés du portfolio.
- Si aucune sauvegarde n’existe sur le compte, la progression locale est importée une seule fois.
- Un appareil vierge récupère la progression du compte : collection, exemplaires Shiny, statistiques, réserve horaire et booster en cours.
- Les modifications locales sont envoyées avec une révision optimiste. Une ancienne révision n’écrase pas une sauvegarde plus récente.
- En cas de conflit ou de changement de compte, une décision explicite est demandée. Les collections ne sont pas additionnées. Une copie de secours locale est écrite avant tout remplacement : `cards.backup.local.<compte>` ou `cards.backup.remote.<compte>`.
- Réinitialiser la collection locale suspend la synchronisation sans effacer le compte ; « Réessayer la synchronisation » permet de la récupérer.
- Pendant une séquence d’ouverture, le conflit est présenté à sa fin pour ne pas superposer deux modales.
- Une panne réseau conserve la progression locale, affiche « synchronisation indisponible » et permet une reprise à la reconnexion, au retour dans l’onglet ou via « Réessayer la synchronisation ».
- Les simulations ne sont pas créditées ni transférées comme booster actif.

## Stockage et sécurité

`/api/tetris/cards` utilise le périmètre des cookies de compte existants. L’identité Google ou Apple est vérifiée côté serveur ; le navigateur ne choisit jamais le propriétaire. Les écritures vérifient l’origine, le destinataire et la révision, puis valident le contenu. Le rôle anonyme et le rôle authentifié n’ont aucun accès direct à la table. Seule la clé serveur accède au stockage.

En production Vercel, la synchronisation exige le stockage Supabase configuré ; il n’y a pas de fallback éphémère. Un fichier SQLite local peut être utilisé hors Vercel sans configuration Supabase pour les tests de stockage, mais il ne remplace pas la connexion OAuth.

La progression est sauvegardée, pas vérifiée contre la triche : les tirages et la réserve restent ceux du prototype client. Aucun jeton de session Apple ou Google n’est exposé au navigateur par cette intégration.

## Accès local

- Mac : `http://localhost:3000/jeux/cards`
- iPhone sur le même Wi-Fi : `http://192.168.1.12:3000/jeux/cards`

Sur l’iPhone, `localhost` désigne l’iPhone. Le Mac doit rester allumé avec le serveur lancé. Son adresse IP peut changer ; le serveur affiche l’adresse réseau au démarrage.
