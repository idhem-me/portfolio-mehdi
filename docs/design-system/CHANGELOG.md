# Changelog du design system

## Fun et Sobre

- Le sélecteur propose Fun et affiche Sobre pour le style local initial. Fun suit le thème clair ou sombre et conserve le comportement de navigation du sélecteur.
- Les tokens de Fun donnent du relief aux contrôles et surfaces, avec un état de pression statique en mouvement réduit. Les cartes des réalisations et des outils reprennent le relief des surfaces.
- Le Playground présente la composition `#fun`. Le comparatif actualise les nuanciers et garde chaque dialogue et menu dans le style de sa colonne.
- Recette réussie pour le lint, TypeScript, le build, les suites Node et les scénarios Fun et Playground dans Chromium et WebKit. Les 42 paires de couleurs contrôlées respectent les seuils AA applicables. Le build conserve l’avertissement de police de secours Google Sans. Le scénario QR en style GitHub échoue aussi sur la version de référence avec une erreur `React.Children.only`. Le QR fonctionne en style Fun.

## Catalogue du Playground

- Chaque composant et ses variantes sont réunis dans un bloc de surface `primary-inverse`, avec le nom du composant comme seul titre.
- L’index et les démonstrations suivent l’ordre alphabétique. L’index de 16 rem s’affiche au bord extérieur de la fenêtre à partir de 64 rem, reste fixe pendant le défilement et peut défiler indépendamment si sa liste dépasse le viewport. Les liens existants conservent leurs ancres.

## Deux variantes de modale

- `SettingsModal` propose `center` et `right` dans le même exemple du Playground. Le panneau droit coulisse sur ordinateur et les deux variantes sont plein écran en densité Mobile.
- Les réglages des jeux utilisent la variante droite, comme avant la mutualisation du conteneur.

## Modale de réglages et tableaux

- `SettingsModal` réutilise le dialogue du DS. Ses tokens pilotent la largeur, l’espacement, le rayon et la hauteur selon la densité. Elle est centrée sur ordinateur et plein écran en mobile.
- `Table` fournit les éléments natifs d’un tableau et une action de tri. Les sessions du backoffice et le classement de jeu partagent ce rendu.
- Les démos génériques du Playground permettent de modifier un réglage et de trier des données fictives.

## Couverture et densité du Playground

- Index des démos, exemples Sidebar et thème local, tailles icône et contrôles natifs. Le registre relie les primitives et adaptateurs aux démos.
- La densité Auto passe en mobile sous 768 px. Les deux densités forcées couvrent aussi les éléments ouverts en portail dans la vitrine.
- Les pastilles du pinceau, le sélecteur de couleur, le Switch et le Slider illustrent l’agrandissement des cibles tactiles. Le suivi des écarts par composant est accessible dans `/playground/local-components`.

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

## Vérification des nouvelles compositions

- Lint à zéro erreur et zéro avertissement. TypeScript, build et quatre suites Node réussis.
- Dix scénarios Chromium et WebKit réussis, dont la modale centrée et plein écran, le retour du focus au déclencheur du jeu et le tri au clavier.
- Tri ascendant et descendant vérifiés sur le tableau de démonstration du backoffice. Les entrées des jeux masqués restent dans l’inventaire interne.
