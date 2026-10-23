# Village — idées pour plus tard

## Gameplay « Ville vivante » (V2)

Flux dérivés recalculés par `computeCity(state, now)` dans `src/game/core/city.ts` (non stockés) :

- **Électricité** : offre (centrales × staffing) vs consommation (MW).
- **Emplois** : offerts par les bâtiments vs actifs (`floor(pop × 0.6)`).
- **Logement** : capacité maisons/mairie vs population réelle.
- **Besoins** N1–N3 (commerce → éducation → culture/loisirs), couverture globale.
- **Efficiency** = powerRatio × staffingRatio (centrales : staffing seul) ; multiplie la production.
- **Population** : converge vers `housing × attractivité` via `exp(−dt / 60s)` dans `tick()`.
- **Impôts** : `pop × TAX_PER_HAB × mult(N)` collectés via la mairie.
- État sérialisable : `population`, `populationUpdatedAt`, `version: 2` + `migrate()`.

On peut construire sans personnel : le bâtiment tourne au ralenti.

## Modèle de carte (V1 actuel)
- Grille de **parcelles 8×8** ; chaque parcelle = 2×2 blocs + routes partagées (période 3).
- Grille de cases : `MAP_SIZE = 24` (8×3). Cases `road` / `highway` / `block`.
- Départ : 4 parcelles centrales ; mairie 2×2 occupe une parcelle entière.
- Achat : `parcelCost(k) = ceil(150 × 1.45^k)` ; parcelle adjacente (4-voisinage).
- Autoroute permanente depuis le nord-ouest vers le réseau de départ.
- Parcelles verrouillées = forêt ; routes visibles seulement si bordées d'une parcelle débloquée (ou autoroute).
- Monument = **2×2** (aucun bâtiment 3×3). Niveaux max / paliers visuels dans `balance.ts`.

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
- Remplacer les placeholders par l'atlas low-poly iso (WebP), fumées, particules, villageois.
- Traduire le contenu du jeu (next-intl) si besoin.
- Ajouter un palier t4 : pousser un seuil dans `VISUAL_TIER_THRESHOLDS` (balance.ts).

## Lancement
- Ajouter le lien Village dans `app-sidebar.tsx`, **conditionné côté serveur** par `isVillageEnabled()`
  (même flag `VILLAGE_ENABLED=true` que la route). Ne jamais exposer le lien si le flag est off.
- Clés i18n déjà présentes : `Village.nav`, `Village.metaTitle`, `Village.metaDescription`.
- **Important Next 16 :** le flag est lu au **moment du build**. Changer `VILLAGE_ENABLED` sur
  Vercel nécessite un **redéploiement**. Absence de variable = jeu désactivé (404).
