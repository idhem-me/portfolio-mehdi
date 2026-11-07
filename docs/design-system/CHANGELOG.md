# Changelog du design system

## En cours

- Cartographie des primitives, adaptateurs, tokens et vitrines existants dans [l’inventaire](inventory.md).
- Audit d’adoption initial dans [l’audit design](../audit/design.md). Aucun changement d’API ou de rendu dans cette phase.

Pour chaque évolution, consigner le composant, les états, les thèmes et la recette. Pour une rupture, noter dans l’ordre la dépréciation, la migration des usages et la suppression.

## Playground dans la navigation du portfolio

- La vitrine et la comparaison sont réunies sur `/playground`. Le panneau secondaire est partagé avec le back-office. Les anciennes URL de comparaison redirigent vers `/playground#comparer`.
- Le réglage de densité de la vitrine est local à ses démonstrations. La navigation et la comparaison conservent leur densité responsive.
- Recette validée dans Chromium pour le Playground et le back-office, avec contrôle des sept langues. Les suites Tetris, Burger, Cards et sécurité passent. Le contrôle TypeScript et le build passent. Le build signale un avertissement sur la police de secours de Google Sans.
- Le lint ciblé passe. Le lint global relève cinq erreurs préexistantes de la règle `react-hooks/set-state-in-effect` dans le fournisseur de design system et deux écrans de Cards.

## Comparaison sur une page distincte

- Le sous-menu ouvre la vitrine sur `/playground` et la comparaison sur `/playground/design-systems`. Le titre et la grille de comparaison sont centrés dans le panneau de contenu. L’alias `/playground/github-vs-adobe` redirige vers la comparaison.
