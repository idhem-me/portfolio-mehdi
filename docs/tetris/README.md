# Tetris — version locale

Travail local sur `feature/tetris-v2`, sans nouveau push ni déploiement pendant cette tâche. Les profils et la sauvegarde automatique décrits plus bas réutilisent le classement et l’authentification Google déjà présents.

## Prévisualisation

```sh
npm ci
npm run dev -- --hostname 0.0.0.0 --port 3000
```

- Jeux : http://localhost:3000/jeux
- Tetris : http://localhost:3000/jeux/tetris
- Rejouer l’onboarding : http://localhost:3000/jeux/tetris?resetOnboarding — **développement uniquement**, paramètre consommé au chargement.

`.env.local` ignoré par Git contient `NEXT_PUBLIC_ENABLE_TETRIS=true`. Sans variable ou avec `false`, la navigation Jeux est absente et `/jeux`, `/jeux/tetris`, ainsi que l’ancienne URL, renvoient HTTP 404. Redémarrer après changement de flag et reconstruire en production locale. L’ancienne URL `/realisations/tetris` redirige en 308 vers `/jeux/tetris` seulement si le jeu est activé. Tetris apparaît dans la section Jeux et reste absent des Réalisations.

La liste et la page du jeu restent en noindex. Aucun sitemap n’existe dans le dépôt : aucune route Jeux n’est ajoutée à un sitemap. Le binding `0.0.0.0` évite une boucle locale Next/next-intl ; il permet aussi l’accès depuis le réseau local.

## iPhone et isolation

Lava n’écrit plus dans les styles de body/html. Les verrous tactiles et le conteneur fixed sont locaux au jeu. Tous les tokens Lava sont hérités de `.lava-game`. Le header du portfolio n’est pas masqué par CSS : la page du jeu appartient au groupe `(game)`, hors AppShell. En revenant à Jeux, le shell normal est retrouvé. Le hook mobile utilise matchMedia/useSyncExternalStore et ne dépend plus d’une frame Safari.

Le verrou de scroll global de la première version est supprimé. Un autre blocage a ensuite été reproduit sur l’adresse LAN du Mac : les taps arrivaient sur Jouer, mais le client de développement ne démarrait pas correctement, avec échec du WebSocket HMR. next.config.ts autorise maintenant les seuls hostname/IPv4 locaux de la machine, sans wildcard. Le test WebKit LAN valide le premier tap, le déplacement, la pose et la pause/reprise. Pour l’iPhone, utiliser l’IPv4 du Mac à la place de localhost ; redémarrer le serveur si son adresse réseau change. Le menu et Touche-moi restent testés avant/après retour au site.

## Structure et réglages

- `engine/` : logique pure TypeScript, SRS, collision, lock delay, score, hold, 7-bag, événements. `Game.on(listener)` renvoie un désabonnement.
- `engine/opening.ts` : option enabled, séquence de dix pièces et placements de référence qui réalisent un Tetris. Le stockage `tetris.onboardingDone` est écrit dès le premier Jouer. Les parties suivantes sont standard ; la transition du script conserve un sac entier et évite une duplication immédiate de I.
- `controls/onboarding.ts` : stockage tolérant aux erreurs, reset local en développement seulement. `resetOpening` est également exportée pour les tests.
- `feel/config.ts` : DAS 130 ms, ARR 32 ms, gestes, spring et réglages utilisateur.
- **`feel/line-config.ts`** : libellés 1 à 4 lignes, durées, taille, rayons, nombre de particules/étoiles, zoom/shake/flash et patterns haptiques. La caméra réagit uniquement à lineClear. Un événement synchronise tous les retours ; tetris/combo ne doublonnent pas les effets.
- `feel/line-celebration.tsx` : styles doré et irisé, pop, hachures, rayons, étoiles et traînées. Avec effets réduits ou prefers-reduced-motion : fondu de texte, aucun zoom/shake/flash ni particules.
- `render/lava.ts` : champ de distance aux **frontières exposées** des masses, cœur lumineux et reflet glossy. Les arêtes internes ne participent pas à la normale ; aucun biseau entre cellules de même couleur. Résolution adaptative 40–100 %, DPR plafonné à 1,5.
- `render/silhouette.ts` : union vectorielle utilisée par ghost, réserve, preview et fallback. Suppression des arêtes partagées ; coins extérieurs convexes arrondis, jonctions concaves franches.
- `ui/game.css` : palette light/dark, géométrie dvh, safe areas, HUD et menus. Le HUD utilise les Badge et les contrôles les Button du portfolio. `GameplayBackground` est un placeholder autonome remplaçable.

Les réglages restent dans `lava-settings`, le record dans `lava-best`. L’option haptique iOS reste non officielle, expérimentale et désactivée par défaut. Aucun son.

## Vérifications

```sh
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium webkit
# Serveur de dev démarré, flag true :
npm run test:tetris:browser
# Serveur redémarré / build reconstruit, flag false :
TETRIS_TEST_DISABLED=true npm run test:tetris:browser
```

[`v3/`](v3/) contient les captures clair/sombre, Chromium desktop et WebKit iPhone : accueil du portfolio, Jeux, menu, partie, pause, 2 lignes et 4 lignes. Ces deux derniers états sont obtenus par de vraies actions du moteur, sans injection de plateau ni route de démonstration. Des captures de géométrie 320×568 et 844×390 complètent la couverture.

## À contrôler sur téléphone physique

Safari avec sa barre d’adresse visible/masquée, rotation de l’appareil, encoches et safe areas ; sortie/reprise après verrouillage du téléphone ; précision des swipes et maintien des boutons ; qualité et temps GPU sur Android milieu de gamme ; haptiques disponibles et absence d’erreur avec l’option iOS. WebKit automatisé ne certifie ni les vibrations ni les 60 fps matériels. La matière reste une simulation visuelle, avec inertie d’effacement simplifiée. Le contenu éditorial du jeu utilise le fallback français pour les autres langues.

## Attribution

Logique adaptée de [sen-ltd/tetris](https://github.com/sen-ltd/tetris), commit `9280c94c2f36a79d7cb184927ec0c8d1f0d48572`, MIT, © 2026 SEN LLC. Licence conservée dans engine/LICENSE.source et consultable dans Règles et informations. Les références de récompense sont les deux images fournies par l’utilisateur, archivées dans [`references/`](references/) ; aucun texte ou asset de leur jeu n’est intégré au rendu.

## Derniers retours appliqués

Ordre du bandeau : Pause, Réglages, Quitter. L’effacement de quatre lignes affiche **Tetris**. Les liens de retour utilisent ArrowLeft de Lucide. Les panneaux règles/réglages définissent leurs propres tokens d’espacement car les portails Radix sont hors du conteneur du jeu : marges de 24 px, interlignes et contrôles tactiles aérés.

Les cellules posées partagent une seule matière : violet lumineux dominant, reflets cyan/rose sur un cycle doux de 32 secondes. La pièce active et les previews restent colorées. Les vraies cases vides restent visibles et le moteur ne change pas. Réglages : render/material.ts ; rendu WebGL et fallback SVG cohérents. Captures actualisées dans [`v4/`](v4/).

## V2 : son et classement

Branche `feature/tetris-v2`. Flags indépendants (false par défaut dans `.env.example`) :

```env
NEXT_PUBLIC_ENABLE_TETRIS=true
NEXT_PUBLIC_ENABLE_TETRIS_SOUND=true
NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD=true
```

Redémarrer le dev server ou reconstruire après changement des flags publics. Le son reste **Off** pour une première visite ; un seul toggle On / Off dans Réglages, aucun volume. Les fréquences, enveloppes, gain et limites sont dans `src/features/tetris/feel/audio.ts`. Vérifier le volume réel et les interruptions sur iPhone physique avant d’ajuster le gain.

Le top 20 public affiche les records de moins de 90 jours. Les envois manuels sans profil restent disponibles ; avec un profil local, les parties terminées sont automatiquement vérifiées puis enregistrées dans un historique privé, distinct du classement public. Les comptes Google gardent leur identité et leurs records existants. La première partie guidée reste exclue du classement Google. Les enregistrements générés par les tests sont des données de test, pas des joueurs réels.

Sur **Vercel**, le classement doit utiliser le backend Supabase configuré et les migrations à jour ; ne pas activer son flag si la migration 003 n’a pas été appliquée. Les secrets Supabase restent exclusivement côté serveur. `.env.local` et les fichiers SQLite ne sont ni commités ni téléversés.

La croix en jeu ouvre Pause. Reprendre conserve la partie ; Quitter (bouton destructif) l’abandonne et retourne au menu. Les raccourcis P et Échap restent disponibles. Les pages restent en noindex.

## Android et classement persistant

Les contraintes mobiles et les couleurs de l’avatar sont vérifiées par `tests/responsive.spec.ts` sur Chrome Android émulé, Chromium et WebKit. Captures dans [`responsive/`](responsive/). Le test Auto Dark compare les pixels de l’avatar ; les sept traductions doivent rester dans le viewport. Cela complète les tests iPhone ; un contrôle physique Samsung Internet reste nécessaire.

Le backend persistant du classement est maintenant intégré via Turso/libSQL. Configuration serveur : `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN`. Sans ces paramètres, le classement ne peut pas être activé sur Vercel et n’utilise jamais son disque éphémère. Les tables sont créées automatiquement dans une base dédiée. Voir [la procédure d’activation complète](LEADERBOARD_SETUP.md). Les anciennes indications demandant un adaptateur distant sont désormais satisfaites ; il reste à connecter la base et vérifier la persistance en production.

## Supabase (backend recommandé avec votre compte existant)

L’adaptateur Supabase est intégré. Appliquer les migrations 001, 002 puis 003, configurer `SUPABASE_URL` et `SUPABASE_SECRET_KEY` exclusivement côté serveur dans Vercel, puis reconstruire. Le backend Supabase est prioritaire sur Turso si ses variables sont présentes. Voir [le guide Supabase](LEADERBOARD_SETUP.md) pour les étapes exactes.

## Game over, choix d’identité et rendu verre

L’écran Game over propose le récapitulatif et la relance. Sans profil joueur, l’envoi public au pseudo ou avec Google reste volontaire. Avec un profil, la sauvegarde est automatique ; les scores de profil local restent privés, tandis que Google conserve le classement public. La configuration du fournisseur est détaillée dans [GOOGLE_AUTH_SETUP.md](GOOGLE_AUTH_SETUP.md).

Le halo extérieur du plateau a été supprimé. Le titre et les actions occupent le haut des colonnes sur desktop/tablette, tandis que les petits écrans conservent des cibles tactiles utilisables. Le néon intérieur, les reflets de verre et leur intensité se règlent dans `src/features/tetris/render/material.ts`. WebGL et fallback SVG partagent cette intention de matière ; les menus et Game over restent dans la DA neutre du portfolio. Captures de la version courante : [`v5/`](v5/).

## Profils joueurs et sauvegarde automatique

La même icône avatar en haut de `/jeux` et dans Tetris ouvre une popup pour le pseudo et la photo. Le profil est lié à un cookie HttpOnly serveur et partagé entre les deux interfaces. Les fichiers acceptés sont JPEG, PNG ou WebP ; ils sont réduits à 512 px et 180 Ko avant envoi. La photo peut être retirée.

Avec un profil local, chaque partie terminée est rejouée et validée par le serveur puis conservée dans l’historique privé local, sans publication au classement Google. Si le navigateur est hors ligne, un petit nombre de runs est mis en file et retenté au retour du réseau. Avec Google authentifié, l’identité Google et le classement général existant sont conservés ; les parties admissibles sont envoyées automatiquement au compte. Aucun rapprochement d’identités ne se fait par pseudo.

Pour le backend Supabase, appliquer aussi `supabase/migrations/202610250003_tetris_local_profiles.sql` après les migrations 001 et 002. Cette migration ajoute l’avatar Google et crée le stockage privé des profils/historiques. Elle n’est pas appliquée automatiquement depuis l’application. Les anciens records restent en place ; ils affichent l’avatar par défaut lorsqu’aucune photo n’avait été enregistrée.

L’accueil et la carte de `/jeux` dessinent les formes à partir de `PieceShape`, donc reprennent directement les couleurs et matières actuelles du plateau. Les noms techniques et clés `lava-*` sont conservés pour compatibilité ; seul le nom affiché est « Tetris ».

## Correction identité / Game over (25 octobre 2026)

Le bouton Google est désormais rendu par Google Identity Services, via un composant partagé entre Profil joueur et Game over. Le jeton est échangé côté serveur avec `signInWithIdToken` dans **le même projet Supabase Auth** ; nonce aléatoire en cookie HttpOnly et empreinte SHA-256 transmise à Google. Aucun token de session n’est stocké dans le navigateur. Le flux OAuth PKCE historique reste compatible pour ses retours existants.

Configurer `GOOGLE_CLIENT_ID` avec **le Client ID Web déjà déclaré dans le fournisseur Google Supabase**, puis autoriser les origines JavaScript exactes du site et du développement dans Google Cloud. Aucun deuxième client OAuth à créer. Les variables Supabase du guide Google restent nécessaires. Le bouton signale son indisponibilité si la configuration ou le script externe manque.

Appliquer après 001–003 la migration additive `supabase/migrations/202610250004_tetris_identity_receipts.sql`. Elle ajoute des confirmations privées par partie pour des nouvelles tentatives idempotentes, sans effacer les anciens scores ni profils. Les personnalisations Google utilisent la table de profils existante sous l’identifiant de compte ; le profil local du navigateur reste distinct et réapparaît après déconnexion. Aucun rapprochement par pseudo.

Game over : un profil local ou une identité Google validée suffit à déclencher la sauvegarde automatique. Un joueur anonyme choisit un pseudo (création du profil persistant puis sauvegarde privée) ou Google (sauvegarde automatique au compte, sauf partie guidée). Le brouillon et le replay restent dans sessionStorage jusqu’à confirmation, dans la limite de validité serveur de 24 h. La file locale est liée à l’identité destinataire ; un changement de compte bloque l’attribution et conserve le score en attente. Les anciens scores publics invités restent lisibles, mais le nouveau parcours pseudo crée un profil privé.

La sidebar conserve Sheet/Avatar/Input/Button et des espacements dédiés, indépendants des grands contrôles des réglages. Enregistrer utilise explicitement `primary`, alias compatible des tokens neutres du variant `default`. Le bouton photo secondaire utilise les dimensions compactes du design system, avec les cibles tactiles mobiles conservées.

Les parcours navigateur Google émulent uniquement la frontière du SDK Google et l’échange de jeton : ils ne certifient pas une connexion personnelle auprès du fournisseur. Utiliser `TETRIS_TEST_BASE_URL=http://localhost:3001` pour vérifier une preview sur un autre port. Les tests réels SQLite/libSQL/PostgreSQL couvrent les transactions et l’absence de doublons.
