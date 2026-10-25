# Vérification V3 — 25 octobre 2026

## Parcours activés

83 tests unitaires passent, dont ouverture réelle vers un Tetris, réclamation persistée, deuxième partie standard, transition vers deux sacs complets, et contours vectoriels disjoints.

9 parcours Playwright passent : gate/redirect, deux parcours Chromium desktop clair/sombre, fallback SVG + reduced motion + game over/record, géométries 320×568 et 844×390, reset dev de l’onboarding, régression WebKit iPhone (menu + Touche-moi avant/après retour client), deux parcours WebKit iPhone clair/sombre.

28 captures demandées + 2 captures de géométrie. Les 2 et 4 lignes résultent du même script d’ouverture joué par le clavier. Pour les 2 lignes, seule l’orientation de la sixième pièce est changée : les deux rangées du bas sont complètes, les rangées supérieures ne le sont pas.

Les tests collectent les erreurs JavaScript ; les parcours principaux vérifient que WebGL reste actif. La revue visuelle a corrigé les biseaux internes et l’opacité de la pause. Une marge protège les contrôles pendant le zoom Tetris. La pause est hors du wrapper de caméra pour rester plein écran même pendant un zoom.

## Comparaison avec main

`git diff main -- content/fr/realisations.md src/app/globals.css src/components/layout/mobile-brand-bar.tsx src/components/creative/gravity-playground.tsx` est vide. La même suppression de Lava restaure les sept listes de réalisations. AppSidebar ajoute seulement une entrée conditionnelle ; flag false, la liste de liens existante est conservée. AppShell et les composants de navigation conservent leur comportement, hormis la lecture mobile désormais synchrone via useSyncExternalStore. Aucun style Lava ne cible html/body/header ni les autres composants du portfolio.

Il s’agit d’une comparaison de source et de comportements testés, pas d’une prétendue comparaison pixel à pixel avec un build séparé de main. Main n’a pas été checkout/modifiée.

## Portée matérielle

WebKit Playwright sur Mac avec profil iPhone 13 : preuve de compatibilité de ces parcours, pas d’une reproduction de l’iPhone physique signalé. Le défaut global identifié et la limite de reproduction sont détaillés dans DECISIONS.md. Safe areas physiques, vibrations et temps GPU restent à vérifier sur téléphone.

## Flag désactivé
Build de production local servi par next start. Deux parcours passent, sept parcours de gameplay sont volontairement ignorés. HTTP 404 sur /jeux, /jeux/tetris et /realisations/tetris, sans préfixe et en fr/en/ar. Navigation Jeux absente ; réalisations sans Lava. Menu et Touche-moi réagissent sur WebKit iPhone. Aucun sitemap ne référence le jeu.

## Contrôles de code
Lint : zéro erreur, un warning préexistant gaze-avatar. Type-check : succès. Builds false puis true : succès ; warning préexistant de métriques Google Sans. Aucune fonction V2 implémentée, aucun push/déploiement, main intacte.
