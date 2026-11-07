# Revue du design system et plan Playground

Audit statique du 7 novembre 2026. [Couverture par module](playground-coverage.md) et [écarts à traiter individuellement](playground-local-components.md).

## État du catalogue

- Sur les 20 modules de primitives, 18 ont une démo. Sidebar affiche une carte avec le nom de l’exemple, sans navigation interactive. ScopedTheme manque d’un exemple montrant le thème local et son effet dans un dialogue.
- Le catalogue et le comparateur sont écrits à la main. Une nouvelle primitive, variante ou modification CSS peut passer sans démo. Button montre ses tailles texte, tandis que les quatre tailles icône et l’alias primary ne sont pas présentés dans sa section.
- Le comparateur illustre un sous-ensemble des composants et tokens. La parité Mehdi, Primer et Spectrum doit être vérifiée fournisseur par fournisseur. Spectrum conserve son activation actuelle.
- Le catalogue force Desktop au premier rendu, même sur un téléphone. Les menus, infobulles et dialogues Radix utilisent des portails sans conteneur local explicite. Le scope du catalogue fournit un conteneur à Primer. La densité forcée peut donc s’appliquer au bouton et manquer dans le menu qu’il ouvre.
- Les tokens mobiles sont définis à 44 px sous 768 px et dans la simulation. Certains contrôles gardent des dimensions fixes et l’adaptateur Primer redéfinit des tailles de contrôle. La géométrie et la surface réellement cliquable restent à mesurer.

## Règle de couverture

Un changement visuel du DS doit mettre à jour le Playground dans le même lot. Cela comprend les nouveaux composants, variantes, états, tokens, thèmes, tailles, effets et changements de comportement visibles. Chaque primitive et chaque adaptateur avec une sortie visuelle a une ancre de démo. Les nouvelles compositions de fonctionnalité reçoivent un scénario si elles introduisent une interaction ou un état réutilisable. Une primitive locale à traiter reçoit une entrée dans l’inventaire dédié. Les infrastructures sans rendu et les exceptions documentées ont un motif explicite. Les exceptions concernant les jeux masqués restent internes.

Les démos rendent les vrais composants avec des données fictives. Le scénario couvre les états pertinents et expose le changement dans le catalogue, même s’il apparaît seulement après une interaction. Les modifications de tokens apparaissent dans les échantillons et sur les composants affectés. L’inventaire indique pour chaque entrée son statut et sa destination.

## Densité tactile

Conserver les deux densités. Faire démarrer la vitrine en mode Auto, puis permettre de forcer Desktop et Mobile. Garder le visuel compact lorsque nécessaire et viser une zone d’activation mobile de **44 × 44 px CSS** pour les actions autonomes, y compris les icônes, les fermetures et les contrôles dans les portails. Vérifier l’espacement des cibles adjacentes et documenter les exceptions comme les liens dans un paragraphe. Les 44 px sont la règle produit proposée et correspondent au seuil du critère renforcé AAA. Le critère AA définit 24 px CSS avec des exceptions, notamment d’espacement. [W3C, cible renforcée](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) · [W3C, cible minimale](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

## Plan à valider

| Lot | Périmètre | Critère d’acceptation |
| --- | --- | --- |
| DS-01 · Couverture obligatoire | Registre typé des démos et exceptions, index avec ancres et test de couverture des modules `ui` et adaptateurs. | Une primitive sans entrée fait échouer le contrôle. La revue de chaque changement vérifie la démo et ses états, car le registre seul ne détecte pas toute régression visuelle. |
| DS-02 · Vitrine tactile | Sélecteur Auto, Desktop et Mobile. Démo Sidebar, thème local, icônes, menu de choix et contrôles natifs. Portails des démos sous le scope adéquat. | À 390 px en mode Auto et en Mobile forcé sur grand écran, vérifier la zone active des contrôles ciblés, y compris dans les menus. Refaire à 767 et 768 px et vérifier la densité Desktop, le clavier, le retour du focus et les deux thèmes. |
| DS-03 · Page des composants locaux | Ajouter `/playground/local-components` et son entrée dans la navigation du Playground. Publier les écarts publics avec statut et identifiant. | Accès dans les sept langues. Aucun contenu privé, lien ou indice sur les jeux masqués. Les routes existantes gardent leur URL. |
| DS-04 · Corrections unitaires | Prendre les tickets LOCAL par composant et par comportement. Prioriser pinceau, Switch, Slider, contrôles de fermeture et sélecteur de couleur après mesure. | Chaque correction a un exemple dans le Playground et une vérification sur la surface d’origine. |

Le plan ne prévoit ni déplacement ni suppression de fichier. Les principaux risques sont la perte de focus ou de positionnement après un changement de portail, les débordements à petite largeur et la divergence entre fournisseurs. Valider Chromium et WebKit, clair et sombre, les sept locales pour le chargement, et des scénarios représentatifs en arabe RTL et en chinois. Après chaque lot, lancer lint, typecheck, build et les tests du dépôt. Les régressions de dimensions ou d’interactions nécessitent des tests ciblés.

## Vérifications de l’audit documentaire

- `git diff --check` et `tsc --noEmit --incremental false` passent.
- `npm test`, `npm run test:burger`, `npm run test:cards` et `npm run test:security` passent.
- `npm run lint` signale 5 erreurs et 8 avertissements sur le code existant, dont une erreur dans le fournisseur du DS.
- Les commandes Next de génération et de build ainsi que les tests navigateur restent pour la phase d’exécution. L’audit s’appuie sur le code source et ne mesure pas les cibles dans le navigateur.

## Validation et réalisation

Le seuil validé est un viewport strictement inférieur à 768 px. Le mode Auto, les modes forcés, le registre et les exemples sont en place. La page des composants locaux suit les écarts unitaires. Les pastilles du pinceau, le sélecteur de couleur, le Switch et le Slider ont reçu les premiers ajustements de cible. Le menu et le dialogue du catalogue héritent de la densité forcée.

Le contrôle TypeScript, le build dans une copie sans fichiers de configuration privés et les quatre suites Node passent. Le lint retrouve les 5 erreurs et 8 avertissements préexistants. Les tests navigateur couvrent les cibles à 767 et 768 px, les menus et le retour du focus, Primer en thème sombre, les anciennes URL de comparaison et la page des écarts dans les sept langues. Spectrum garde son activation par flag.
