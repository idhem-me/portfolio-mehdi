# Village — idées pour plus tard

## Gameplay « Ville vivante » (V2)

Flux dérivés recalculés par `computeCity(state, now)` dans `src/game/core/city.ts` (non stockés) :

- **Électricité** : offre (centrales × staffing) vs consommation (MW).
- **Emplois** : offerts par les bâtiments vs actifs (`floor(pop × 0.6)`).
- **Logement** : capacité maisons/mairie vs population réelle.
- **Besoins** N0–N3 **par logement** (commerce → éducation → culture/loisirs locaux) ; santé / sécurité pour évolution.
- **Couverture** : services par rayon Manhattan + capacité (`coverage.ts`) ; overlay HUD « Couverture » ; électricité / emploi globaux.
- Panneau Ville : répartition « X % des habitants en Nn » + conseil.
- **Planches** : produites par le charpentier (bois → planches, timestamps à la récolte) ; requises pour t4 / immeubles.
- **Évolution auto** des logements (délais EVOLVE/DEVOLVE) — plus d'upgrade manuel résidentiel.
- **Efficiency** = powerRatio × staffingRatio (centrales : staffing seul) ; multiplie la production.
- **Population** : converge vers `housing × attractivité` via `exp(−dt / 60s)` dans `tick()`.
- **Impôts** : `pop × TAX_PER_HAB × mult(N)` collectés via la mairie.
- État sérialisable : `population`, `populationUpdatedAt`, `version: 5` + `migrate()`.

On peut construire sans personnel : le bâtiment tourne au ralenti.

## Modèle de carte (DA top-down — phase 1+)
- Vue de **dessus** (pas iso). Constantes : `mapConfig.ts` / lanes : `mapLanes.ts`.
- Carte **10×8 blocs** (5976×5976 px/bloc) ; tuile 1254, route/intersection 320.
- Motif par axe : `I | T | T | I | T | T | I` ; blocs adjacents **partagent** la route de bordure.
- Ownership N/O = sérialisation seulement ; route jouable / non grisée dès qu’un voisin est débloqué.
- Départ : 4 blocs centrés `4,3`–`5,4` ; mairie **1×1** ; route d’entrée bitume depuis l’est.
- Assets : `/public/game/asset-village/` ; manquants → placeholders auto.
- GameState **v3** : pas de migration, reset si version < 3.
- Phases suivantes : gen biomes/eau, routes payantes, connexion bâtiments.

## V1.1
- Sauvegarde localStorage (zustand persist, version + migrate), modale « Pendant ton absence ».

## Portfolio
- Bâtiments au niveau max → bulle qui pointe vers un projet/compétence
  (École → formation, Bibliothèque → articles, Marché → projets clients, Monument → hall of fame).

## Rétention
- Quêtes simples, bonus quotidien à la mairie, tutoriel en 5 étapes.

## V2 (optionnel)
- Cloud save + classement via Upstash Redis (Vercel Marketplace), heure serveur, contrôle de plausibilité.

## Visuel
- Rendu **top-down** (grille carrée, `TILE = 64` monde) — style Mini Motorways / Pocket City.
- Convention assets (`assets.manifest.json` + `assets.ts`) :
  - Sprite = **2×** taille monde → **128 px par case** (1×1 = 128×128, 2×1 = 256×128, 2×2 = 256×256).
  - Sprites DA top-down intégrés dans `public/game/sprites/{png,webp}/` (status `done` dans le manifeste).
  - **Runtime temporaire** : charge encore `/public/game/asset-village/` via `villageAssets.ts` (PNG plein res).
  - **À terme** : une seule source = `assets.manifest.json` + `sprites/` ; supprimer `asset-village/` et `villageAssets.ts`.
  - Les sprites DA incluent leur socle ; ombre code à désactiver pour eux (placeholders gardent l'ombre).
  - Anchor **`[0, 0]`** (haut-gauche de l'empreinte) ; placement = `gridToWorld(gx, gy)` + scale `TILE/128`.
  - Status `todo` = art iso obsolète / manquant ; placeholders procéduraux en attendant.
- Remplacer les placeholders restants par atlas WebP, fumées, particules, villageois.
- Traduire le contenu du jeu (next-intl) si besoin.
- Ajouter un palier t4 : pousser un seuil dans `VISUAL_TIER_THRESHOLDS` (balance.ts).

## Lancement
- Ajouter le lien Village dans `app-sidebar.tsx`, **conditionné côté serveur** par `isVillageEnabled()`
  (même flag `VILLAGE_ENABLED=true` que la route). Ne jamais exposer le lien si le flag est off.
- Clés i18n déjà présentes : `Village.nav`, `Village.metaTitle`, `Village.metaDescription`.
- **Important Next 16 :** le flag est lu au **moment du build**. Changer `VILLAGE_ENABLED` sur
  Vercel nécessite un **redéploiement**. Absence de variable = jeu désactivé (404).
