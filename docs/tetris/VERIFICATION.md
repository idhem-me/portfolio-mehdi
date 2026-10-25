# Vérification locale — 25 octobre 2026

## Couverture

- 78 tests moteur : 7-bag sur 100 sacs, cycles et transitions SRS des sept pièces dans les deux sens, kick au mur/fond, obstruction, collisions, ghost, effacements multiples, score réel/B2B/combo/niveau, hold, points de chute, événements et désabonnement, lock delay et plafond de resets, game over.
- Chromium : réalisation et noindex, clavier/DAS, overlay tactile, pause manuelle et blur, réglages persistés, record en fin de partie, fallback forcé sans WebGL et reduced motion.
- Captures mobile 390×844 et desktop 1440×1100, thèmes light/dark. Paysage 844×390. Les screenshots desktop cadrent le composant ; les screenshots mobile montrent l’espace de jeu dédié.
- La source du shader compile et le canvas reste actif dans les quatre parcours principaux. Les erreurs JS/console inattendues font échouer les tests.

## Limites de mesure

Chromium s’exécute sur le Mac local. Aucun débit sur téléphone physique ni haptique matérielle n’est certifié. La résolution shader s’adapte au temps des frames ; cette adaptation ne remplace pas un profilage GPU Android/Safari.

Aucun sitemap n’existait : `/sitemap.xml` renvoie 404 et ne référence pas Lava. Le test vérifie cette absence sans créer un sitemap ni inventer un domaine public.

## Commandes reproductibles

Voir `TETRIS_README.md`. Les tests navigateur nécessitent le serveur démarré séparément. La variable de test `TETRIS_TEST_DISABLED=true` sélectionne les assertions du flag off et saute les parcours de gameplay.

## Résultats finaux

- `npm test` : 78/78 passent.
- `npm run typecheck` : succès.
- `npm run lint` : succès, zéro erreur ; un warning préexistant gaze-avatar.
- `npm run build` : succès avec flag true, et succès avec flag false ; warning préexistant de métriques Google Sans.
- Flag true : 7/7 parcours Chromium passent, sans erreur JS inattendue.
- Flag false : build de production local servi avec next start ; test dédié passé (six parcours de gameplay ignorés volontairement). Liste sans carte, HTTP 404 sur les routes sans préfixe, fr, en et ar, X-Robots-Tag noindex. Aucun sitemap ne référence Lava.
- État livré : .env.local rétabli à true, défaut versionné false, robots noindex/nofollow, serveur de dev local.
