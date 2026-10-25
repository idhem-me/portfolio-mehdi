# Lava — version locale

Travail local sur `feature/tetris`, sans push/déploiement ni modification de main. Aucune fonctionnalité V2 développée ; Classement est un bouton désactivé.

## Prévisualisation

```sh
npm ci
npm run dev -- --hostname 0.0.0.0 --port 3000
```

- Jeux : http://localhost:3000/jeux
- Lava : http://localhost:3000/jeux/tetris
- Rejouer l’onboarding : http://localhost:3000/jeux/tetris?resetOnboarding — **développement uniquement**, paramètre consommé au chargement.

`.env.local` ignoré par Git contient `NEXT_PUBLIC_ENABLE_TETRIS=true`. Sans variable ou avec `false`, la navigation Jeux est absente et `/jeux`, `/jeux/tetris`, ainsi que l’ancienne URL, renvoient HTTP 404. Redémarrer après changement de flag et reconstruire en production locale. L’ancienne URL `/realisations/tetris` redirige en 308 vers `/jeux/tetris` seulement si le jeu est activé. Lava ne figure plus dans les réalisations, dans aucune langue.

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

`docs/tetris/v3/` contient les captures clair/sombre, Chromium desktop et WebKit iPhone : accueil du portfolio, Jeux, menu, partie, pause, 2 lignes et 4 lignes. Ces deux derniers états sont obtenus par de vraies actions du moteur, sans injection de plateau ni route de démonstration. Des captures de géométrie 320×568 et 844×390 complètent la couverture.

## À contrôler sur téléphone physique

Safari avec sa barre d’adresse visible/masquée, rotation de l’appareil, encoches et safe areas ; sortie/reprise après verrouillage du téléphone ; précision des swipes et maintien des boutons ; qualité et temps GPU sur Android milieu de gamme ; haptiques disponibles et absence d’erreur avec l’option iOS. WebKit automatisé ne certifie ni les vibrations ni les 60 fps matériels. La matière reste une simulation visuelle, avec inertie d’effacement simplifiée. Le contenu éditorial du jeu utilise le fallback français pour les autres langues.

## Attribution

Logique adaptée de [sen-ltd/tetris](https://github.com/sen-ltd/tetris), commit `9280c94c2f36a79d7cb184927ec0c8d1f0d48572`, MIT, © 2026 SEN LLC. Licence conservée dans engine/LICENSE.source et consultable dans Règles et informations. Les références de récompense sont les deux images fournies par l’utilisateur, archivées dans docs/tetris/references ; aucun texte ou asset de leur jeu n’est intégré au rendu.

## Derniers retours appliqués

Ordre du bandeau : Pause, Réglages, Quitter. L’effacement de quatre lignes affiche **Tetris**. Les liens de retour utilisent ArrowLeft de Lucide. Les panneaux règles/réglages définissent leurs propres tokens d’espacement car les portails Radix sont hors du conteneur du jeu : marges de 24 px, interlignes et contrôles tactiles aérés.

Les cellules posées partagent une seule matière : violet lumineux dominant, reflets cyan/rose sur un cycle doux de 32 secondes. La pièce active et les previews restent colorées. Les vraies cases vides restent visibles et le moteur ne change pas. Réglages : render/material.ts ; rendu WebGL et fallback SVG cohérents. Captures actualisées dans docs/tetris/v4.
