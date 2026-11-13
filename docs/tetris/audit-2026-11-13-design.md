# Audit Tetris — design system et ergonomie

Date : 13 novembre 2026. Rôle : designer. Phase 2, proposition à valider avant code.

## Méthode et limites

Lecture du code courant, du guide DS, de l’inventaire et des règles du dépôt. Aucun code ni fichier d’environnement modifié. Pas de session navigateur exécutée par cet agent : contrastes, débordements, perception des animations et parcours clavier sont des critères de validation, pas des mesures établies. Les captures historiques ne constituent pas une preuve du rendu courant.

## Diagnostic prouvé

| Priorité | Constat et preuve | Conséquence / décision proposée |
| --- | --- | --- |
| P1 | `src/features/tetris/ui/game.css:4` et `:24` définissent sept couleurs hex fixes, avec seulement une variante sombre. | Les pièces ont déjà des variables CSS, mais aucune relation au DS sélectionné. Déplacer la propriété de leur palette dans les thèmes et conserver un contrat stable par pièce. |
| P1 | `src/features/tetris/render/lava.ts:127` invalide sa palette sur `document.documentElement.className`; `src/components/design-system/provider.tsx:52` change `dataset.designSystem`, après chargement du CSS. | Un changement Sobre/Fun/Aero ne suffit pas à rafraîchir WebGL. Une palette DS CSS seule serait une correction incomplète. Recalculer sur changement de thème effectif et de portée, après CSS chargé, y compris restauration et aperçu forcé. |
| P1 | `src/features/tetris/ui/game-over.tsx:272` empile Rejouer, Classement, Menu, Quitter le jeu et éventuellement Enregistrer en ligne. | Deux sorties voisines et une action de sauvegarde placée après les sorties rendent la décision confuse. Une action principale Rejouer, une secondaire Retour à l’accueil du jeu, puis Classement discret. La sauvegarde appartient au bloc résultat, pas à la navigation. |
| P1 | `src/features/tetris/ui/game-over.tsx:190` construit le message de succès, mais `:258` ne rend `message` que lorsque `!sent`. | L’envoi réussi n’a pas de confirmation textuelle visible dans ce bloc ; afficher un statut stable Réussi, pas seulement un bouton désactivé. |
| P1 | `src/features/tetris/ui/game-over.tsx:233` met le titre hors tabulation avec `tabIndex=-1`, sans appel de focus ; le composant est une région, pas un Dialog. `src/features/tetris/ui/tetris.tsx:764` superpose aussi une pause en simple div. | Les contrôles en dessous peuvent rester dans le parcours clavier. Choisir un écran résultat qui remplace le plateau interactif ; pour la pause modale, employer Dialog et son focus géré. Conserver l’annonce live existante à `tetris.tsx:885`, sans double annonce bruyante. |
| P1 | `src/features/tetris/ui/game-over.tsx:234` et `:242`, ainsi que les nombreux libellés de `tetris.tsx`, sont en français/en anglais codés en dur ; format numérique fixé à `fr`. | Localiser les surfaces touchées dans les sept langues et formater selon la locale. Ne pas annoncer une conformité RTL/chinois tant que non vérifiée. |
| P2 | `src/features/tetris/render/material.ts:2`, `render/board.tsx:79`, `ui/piece-shape.tsx:18` imposent des reflets blancs/noirs et une matière verre commune. | Les couleurs peuvent changer tout en gardant un objet très « verre » en Sobre ou Fun. Première livraison : palette cohérente et lisible. Seconde option : intensité de reflet/contour par thème, sans ajouter quatre moteurs. |
| P2 | `src/features/tetris/ui/game.css:67` force le stage en LTR, et `:857` place une fermeture à droite. | Garder les coordonnées et les commandes spatiales de jeu stables ; rétablir la direction de lecture des libellés/HUD et utiliser les propriétés logiques pour les interfaces. Vérifier en arabe au lieu de retourner le plateau. |
| P2 | `src/features/tetris/ui/game.css:1084`, `:1103` redéfinissent plusieurs fois le panneau final. `--tetris-touch` à `:15` vaut 3rem. | Les cibles de fin ont déjà une base 48 px ; ne pas prétendre qu’elles sont trop petites. Consolider les règles dans le lot approuvé et aligner la densité sur les tokens existants, minimum mobile 44 px. |

## Contrat de palette proposé

Conserver les noms `--tetris-piece-i`, `--tetris-piece-o`, `--tetris-piece-t`, `--tetris-piece-s`, `--tetris-piece-z`, `--tetris-piece-j`, `--tetris-piece-l` : chaque nom signifie la même pièce dans plateau, réserve, prochaine pièce, couverture et repli SVG. Aucun mapping dépendant de l’ordre d’un tableau de couleurs de charts. Éviter de confondre une pièce rouge avec le rôle d’erreur de l’interface : ce sont des tokens de jeu catégoriels.

Définir les valeurs Sobre dans le niveau de tokens du DS, puis les variantes dans `fun.css`, `frutiger-aero.css`, `liquid-glass.css`, clair et sombre. Retirer les déclarations de palette fixes de `.lava-game` et `.tetris-cover` qui masqueraient l’héritage. Suivre les sélecteurs de portée déjà utilisés par ces thèmes ; une démo forcée ne doit pas colorer ses voisines. Les valeurs finales sont à choisir et mesurer lors de la refonte, pas à approuver comme des hex arbitraires dans cet audit.

| Thème | Direction visuelle | Contraintes |
| --- | --- | --- |
| Sobre | Chroma mesuré, séparation nette, reflets discrets. | Sept identités discernables ; pas de pièces toutes grises ou toutes couleur accent. |
| Fun | Palette chaleureuse et soutenue, violet/jaune/orange en cohérence avec la palette existante, complément cyan/bleu/vert différencié. | Ne pas mapper sept pièces sur les trois seuls accents existants. Contours lisibles, pas d’ombre qui modifie la grille perçue. |
| Frutiger Aero | Eau, vert, bleu, nuances complémentaires, gel contrôlé. | Préserver les silhouettes sur fond clair et sombre, éviter la surexposition des reflets. |
| Liquid Glass (dev) | Teintes transparentes visuellement, contours précis. | Repli opaque et lisibilité ; aucune exposition supplémentaire du thème en production. |

Compléter seulement les rôles nécessaires : `--tetris-board-surface`, `--tetris-piece-outline`, `--tetris-ghost-outline`, `--tetris-ghost-fill`. Réutiliser les tokens de surface, bordure, rayon, focus et contrôle existants pour le chrome. Si la matière par thème est validée, ajouter `--tetris-piece-highlight` et une intensité scalaire consommée par SVG et WebGL, avec valeurs mesurées dans les démos. Ne pas multiplier des tokens inutilisés.

Le passage CSS → WebGL doit résoudre la couleur calculée sur un élément témoin dans la portée du canvas, puis convertir en sRGB pour les uniforms. Tester `var(...)`, `color-mix(...)` et `oklch(...)` réellement employés ; lire une custom property peut laisser des références non résolues que `CanvasRenderingContext2D.fillStyle` n’interprète pas comme une propriété CSS de cet élément. Rafraîchir au changement effectif, pas par lecture de style à chaque frame. Le repli SVG et les miniatures doivent refléter les mêmes choix. À l’arrêt/pause, le changement de DS doit aussi redessiner le canvas.

Critères visuels : forme et contour ne reposent pas sur la seule teinte ; cible de contraste 3:1 pour contours/indicateurs nécessaires à la lecture sur le plateau, texte normal 4,5:1 ; vérifier simulation de déficiences de perception des couleurs. Ne pas revendiquer que toutes les paires de sept couleurs doivent atteindre 3:1. La réserve et les prochaines pièces gardent leurs silhouettes explicites.

## Parcours cible

1. **Accueil du jeu** : Jouer domine. Règles et Classement secondaires ; identité et réglages accessibles sans bloquer le démarrage.
2. **Partie** : HUD stable, réglages et pause clairement séparés des commandes. Pas de demande d’identité au milieu de la partie.
3. **Pause** : vrai dialogue, focus sur Reprendre ; Retour à l’accueil du jeu explicite avec confirmation d’abandon seulement si la partie sera perdue. Fermer les réglages revient à la pause ; la reprise est volontaire.
4. **Résultat** : écran persistant « Partie terminée », score, record et marque explicite si battu, puis lignes/niveau/durée. Le plateau peut rester en aperçu décoratif inerte mais n’est plus interactif. Focus sur le titre. Rejouer principal, Retour à l’accueil du jeu secondaire, Classement tertiaire. « Quitter le jeu » reste dans la navigation générale plutôt que comme cinquième CTA de carte.
5. **Sauvegarde** : une ligne dans le résultat distingue conservé sur appareil, prêt à envoyer, envoi, envoyé, échec réessayable et reconnexion nécessaire. Conserver le résultat visible en cas d’erreur. Rejouer reste disponible ; le cycle de sauvegarde appartient à une couche durable séparée de l’écran pour éviter qu’une navigation perde le travail.
6. **Résultat récupéré** : expliquer « Résultat de votre dernière partie » et sa date si disponible ; ne pas donner l’impression d’une nouvelle défaite au chargement. Une action explicite ferme ce résultat. La politique de brouillon doit être définie avec l’architecte.

## Démonstration et validation

Le Playground public peut montrer un **nuancier catégoriel générique** et une **carte de résultat fictive**, sans mention Tetris, route ou lien vers un jeu masqué. Pour prouver le rendu réel, garder un scénario de test interne et des captures dans `docs/tetris/`, pas une entrée publique jouable. Si aucune composition réutilisable n’est extraite, documenter une exception motivée pour le rendu feature et montrer seulement les tokens/primitives partagés. Mettre à jour inventaire, couverture et changelog dans le lot d’implémentation approuvé.

Matrice minimale : Sobre/Fun/Aero (+ Glass dev) × clair/sombre ; WebGL et repli SVG ; sélection à chaud/restauration/portée forcée ; Desktop/Mobile/Auto ; clavier focus et sortie des dialogues ; français/arabe/chinois et textes longs allemands ; 320 px, mobile portrait/paysage, zoom texte ; mouvement réduit et transparence réduite pour les matières. Capturer résultat, pause et erreurs de sauvegarde, pas seulement une partie normale. Aucun changement de visibilité ou d’URL.

## Décision recommandée

Livrer d’abord le contrat de palette DS et le parcours résultat/pause avec états de sauvegarde intelligibles. Garder le moteur et le scoring actuels. La matière propre à chaque thème est une amélioration optionnelle après preuve de lisibilité ; un twist ludique ne doit pas retarder la correction du parcours de base.
