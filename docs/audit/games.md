# Audit jeux

Lecture statique des boucles, des contrôles et de la persistance. Les observations sur le ressenti sont des hypothèses de test.

| Expérience | Boucle, contrôles, persistance | Ressenti et prochain test |
| --- | --- | --- |
| Tetris, caché | Moteur pur, frame et accélération côté client, gestes pointeur et clavier. Replays validés côté serveur, stockage selon adaptateur, association au compte vérifié et reçus. Réglages partagés, HUD et plateau dédiés. | Mesurer les longues frames lors des effets de ligne sur téléphone, calibrer répétition et premiers gestes. Couvrir la reprise après pause et l’idempotence score. |
| Cards, caché | Ouverture en scènes et animations, frame pour certains effets de carte, pas de boucle permanente nécessaire. Sauvegardes locales et RPC cloud pour économie et adoption du compte. Cosmétiques, avatars et audio dédiés. | Tester ouverture clavier et tactile sans geste obligatoire, mouvement réduit, lisibilité des probabilités et retour après perte réseau. Conserver le choix de sauvegarde et tester sa concurrence. |
| Clicker Burger, public | Tick et persistance périodiques dans `state/useGame.ts`, simulation et progression séparées, sauvegarde navigateur. Pas de classement cloud identifié. Réglages partagés et contrôles d’économie propres au jeu. | Mesurer re-renders des compteurs et reprise d’onglet. Utiliser le script de balance pour vérifier délai au premier progrès, cadence des missions et rejouabilité après pause. Vérifier actions répétées au clavier. |
| Terrain de jeu accueil, public, identification à confirmer | Matter.js dans `gravity-playground.tsx`, synchronisation frame de l’interface. Pinceau et déchirure sont des modules distincts. Aucun score ou stockage Supabase propre repéré. | Mesurer le démarrage, restitution du contrôle et possibilité de quitter. Vérifier tactile, clavier et conservation de la navigation pendant l’interaction. |

- `public/audio` pèse environ 5,9 Mio, `public/cosmetics` 84 Kio. Mesurer ce qui est téléchargé avant geste et par expérience. Conserver activation audio sur geste, mute et réglages sauvegardés, puis examiner les assets les plus lourds.
- `src/lib/games` contient déjà RNG et haptics. Mutualiser d’abord le cycle de vie audio (geste, mute, arrêt), si les interfaces des jeux convergent. Garder moteur Tetris, tick Burger, ouverture Cards et scores serveur séparés tant que leurs contrats diffèrent.
- Utiliser les primitives DS pour menus, paramètres, modales et actions HUD compatibles. Préserver la scène, les effets, le rythme et les cibles de jeu.
- Tests Tetris présents dans `src/features/tetris/engine`, `tests/tetris.spec.ts` et `tests/tetris-audio.spec.ts`, plus scénarios mobiles et identité à la racine. Le dossier manque, pas la couverture. Déplacer les deux suites explicitement nommées et contrôler la découverte de Playwright.
