# Lava — Tetris

Expérience jouable intégrée aux réalisations du portfolio. Tout le travail est local sur `feature/tetris`. Aucun push ni déploiement.

## Lancement

```sh
npm ci
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Ouvrir http://localhost:3000/realisations/tetris (français) ou `/en/realisations/tetris`. Le binding `0.0.0.0` évite une boucle de redirection locale Next.js/next-intl ; le serveur peut être accessible sur le réseau local. Pour une machine non fiable, filtrer le port au niveau du système. `.env.local`, ignoré par Git, contient déjà :

```dotenv
NEXT_PUBLIC_ENABLE_TETRIS=true
```

Sans cette variable ou avec `false`, la carte disparaît dans toutes les langues et la route renvoie HTTP 404, avant streaming. Après tout changement de flag, redémarrer le serveur ; pour la production locale, reconstruire. `.env.example` conserve `false`.

Le projet n’avait pas de sitemap : aucun sitemap n’est ajouté et Lava n’est donc référencé dans aucun sitemap. Même activée, la réalisation porte `noindex,nofollow` (gate manuelle `tetrisPublic = false` dans `src/features/tetris/flags.ts`). Un flag d’affichage ne constitue pas une authentification : la preview locale n’est pas destinée à contenir de données secrètes.

## Jouer

Mobile : boutons sous le plateau, répétition sur maintien gauche/droite/descente ; tap pour tourner, glisser latéralement pour déplacer, vers le bas pour descendre, vers le haut en moins de 330 ms pour lâcher. La partie occupe l’écran disponible et respecte les safe areas ; × revient à la réalisation. Les contrôles peuvent être masqués dans les réglages.

Desktop : flèches, Espace pour lâcher, C/Shift pour réserver, X/↑ et Z pour tourner, P/Échap pour pause. La zone de jeu doit avoir le focus, acquis au démarrage. Les raccourcis ne capturent pas le reste du portfolio. DAS 130 ms / ARR 32 ms. La perte de focus ou de visibilité met en pause ; reprise explicite.

Réserve limitée à une utilisation par pièce, trois pièces suivantes, ghost, 7-bag, SRS complet. Pose après 500 ms, maximum 15 resets par pièce. Single/double/triple/tetris : 100/300/500/800 × niveau ; B2B tetris ×1,5, combo +50 × index × niveau. Soft drop +1/cellule, hard drop +2/cellule. Niveau tous les dix lignes. Pas de T-spin scoring dans cette V1.

## Réglages et tuning

- `src/features/tetris/feel/config.ts` : DAS/ARR, seuils gestes, springs, zooms, bump, shake, nombre de gouttelettes, durée de feedback, patterns haptiques. Toutes les durées haptiques sont en ms.
- `src/features/tetris/ui/game.css` : tokens `--tetris-piece-{i,o,t,s,z,j,l}` light/dark, spacing via `--spacing`, radius via `--radius`, ombres, hauteur plateau, touch targets, easing et durées des menus/lignes. Surfaces, texte et boutons consomment les tokens/composants du portfolio.
- `src/features/tetris/render/lava.ts` : shader de densité, seuil lissé, normale, reflets, Fresnel, bulles, respiration, étirement et fonte ; paramètres numériques du matériau au même endroit. Résolution adaptative entre 40 et 100 %, DPR plafonné à 1,5. Moyenne de 60 frames, baisse au-delà de 21 ms/frame.
- `render/board.tsx` : fallback SVG goo + dégradé brillant en cas d’indisponibilité/échec/perte WebGL. L’animation s’arrête en pause et hors focus.
- `feel/haptics.ts` : `navigator.vibrate` protégé. Le switch iOS 18+ est une expérimentation **non officielle**, désactivée par défaut, sans garantie d’effet ; seule la pose et les événements ligne/tetris le déclenchent.
- Les réglages sont conservés sous `lava-settings`, le record sous `lava-best`. Une indisponibilité de localStorage n’interrompt pas le jeu. `prefers-reduced-motion` réduit la matière et supprime caméra, gouttelettes et zooms de score, indépendamment de l’option utilisateur.

`Game.on(listener)` renvoie une fonction de désabonnement. Le moteur ne dépend ni du DOM ni de React. Les événements typés `move`, `rotate`, `lock`, `hardDrop`, `lineClear`, `tetris`, `combo`, `levelUp`, `gameOver`, `hold` alimentent le feedback. Un futur adaptateur audio s’abonnera au même bus ; aucun son ou contexte audio n’est créé aujourd’hui.

## Vérification

```sh
npm test
npm run lint
npm run typecheck
npm run build
# Avec le serveur de dev démarré et le flag activé :
npm run test:tetris:browser
# Avec le serveur redémarré et NEXT_PUBLIC_ENABLE_TETRIS=false :
TETRIS_TEST_DISABLED=true npm run test:tetris:browser
```

Les captures sont dans `docs/tetris/`. Les covers proviennent du véritable plateau, sans assets externes : `node tools/tetris/capture-covers.mjs` avec le serveur démarré. `npx playwright install chromium` installe le navigateur si nécessaire.

## Publication manuelle, plus tard

1. Relire la réalisation et traduire le contenu de Lava (fallback français actuellement).
2. Tester sur les iPhone/Android visés, en clair/sombre, petites hauteurs et Safari ; mesurer les temps GPU et vérifier les haptiques avec un appareil physique.
3. Garder le flag désactivé par défaut. Activer uniquement dans l’environnement local prévu pour prévisualisation. Pour une future publication, décider explicitement d’étendre l’activation à l’environnement cible.
4. Passer **manuellement** `tetrisPublic` à `true` pour autoriser l’indexation, compléter le sitemap public si un sitemap est créé, puis reconstruire et vérifier robots + métadonnées.
5. Faire une revue avant toute fusion ou livraison. Ce travail n’effectue aucune de ces opérations distantes.

## Limites et suite

La cible 60 fps repose sur le rendu à voisinage borné et sa résolution adaptative ; les captures Chromium ne prouvent pas les performances sur un mobile physique. La matière est une simulation visuelle, pas un fluide physique. L’inertie après effacement est une compensation visuelle globale ; le fallback SVG est plus simple. L’astuce haptique iOS peut ne rien produire. Le français est le fallback éditorial pour Lava dans les autres langues. Un warning lint préexistant reste sur `gaze-avatar.tsx` ; le lint sort avec succès. Le build peut avertir que Google Sans n’a pas de métriques de fallback. L’audit npm signale `body-parser` transitif déjà présent via l’outillage : conservé hors du périmètre, sans `audit fix` global.

V2 : son via le bus existant, T-spins et finesse de jeu, leaderboard avec consentement, défis quotidiens déterministes, mode multijoueur, calibration GPU sur appareils et transitions cellule par cellule plus poussées.

## Attribution

Logique de formes, SRS, collision et randomizer adaptée depuis [sen-ltd/tetris](https://github.com/sen-ltd/tetris), commit `9280c94c2f36a79d7cb184927ec0c8d1f0d48572`, MIT, © 2026 SEN LLC. Licence complète conservée dans `src/features/tetris/engine/LICENSE.source`. Aucun rendu ou composant UI repris.
