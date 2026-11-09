# Changelog du design system

## Typographie Fun

- Les portées de l’accueil et de la navigation héritent maintenant du token global du thème ; les aperçus Sobre forcés gardent Google Sans.
- Bricolage Grotesque est appliquée au texte latin du thème Fun via `--font-sans`. Sobre conserve Google Sans ; l’arabe, le chinois et la monospace gardent leurs familles dédiées.
- Le token Tailwind `--font-sans` garde une valeur de base valide. Les menus globaux héritent ainsi la police du thème actif au lieu de retomber sur Times.
- Vérification corrective : lint, typecheck, 114 tests Node et le test Chromium de l’accueil, de la navigation et des deux menus passent. Le build n’a pas pu être relancé : la commande dans le dépôt rencontre un autre build actif, et Turbopack refuse `node_modules` lié depuis la copie isolée.
- Le Playground présente la typographie dans la composition Fun et expose `--font-sans` dans le comparatif.
- Lint, typecheck, build isolé, suites Node et test Playwright ciblé passent. La suite Playwright complète a été partiellement bloquée par le panneau d’erreur de l’instance Next déjà active, qui interceptait certains clics.

## Frutiger Aero et Liquid Glass

- Le sélecteur et le comparatif proposent les quatre thèmes en développement et limitent la production à Sobre et Fun. Les anciens liens du comparatif redirigent toujours vers sa page actuelle.
- Le thème choisi suit les changements de langue et les rechargements. Il s’applique aux interfaces du site indépendamment du mode clair ou sombre.
- Les deux compositions du Playground montrent les palettes et effets de matière avec les primitives locales.
- Le lint, le typecheck, le build et les quatre suites Node passent. La recette ciblée couvre Chromium, Android Chrome et WebKit iPhone, avec navigation tactile, focus, densité, persistance et transparence réduite. Le build signale l’avertissement de secours Google Sans.
- La suite image passe huit cas sur neuf. L’assertion de compression lit l’aperçu via `fetch(blob:)`, bloqué par `connect-src` dans la politique actuelle du site.

## Accent et pinceau

- Fun affiche la variante Accent en violet dans les deux modes. Le pinceau utilise cette variante et sa commande de sortie reste alignée à côté de lui. La palette et les deux boutons sont visibles dans PaintColor.

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

## Suivi local des composants

- La page de suivi et son onglet sont réservés au développement local. Les anciennes adresses redirigent temporairement vers le catalogue de leur langue.
- Les démos `#textarea`, `#gift-actions`, `#table`, `#swatches`, `#case-study` et `#settings-modal` couvrent les six tickets restants avec des données fictives.
- La visionneuse reprend le dialogue du DS. Le clavier permet de zoomer, de déplacer l’image et de fermer le dialogue avec retour du focus à l’image d’origine.
- Lint, typecheck et les quatre suites Node passent. Les 12 scénarios ciblés passent dans Chromium, Chrome Android et WebKit iPhone. Le build a été validé dans une copie isolée, le dossier de build habituel étant verrouillé par un autre processus. Next signale un avertissement sur les métriques de secours de Google Sans. La recette de production confirme les redirections et la disparition de l’onglet dans les sept langues.
