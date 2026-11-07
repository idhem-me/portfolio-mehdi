# Audit UI/UX

Score indicatif sur cinq, d’après les sources, avec un point par signal dominant observé. P = primitives, T = tokens sémantiques, E = états utiles, A = sémantique/labels, R = adaptations de densité ou responsive. Le score porte sur les commandes et le chrome. Les couleurs produites par un outil et les éléments de décor font partie du produit. Le score ne certifie ni contraste, ni clavier complet, ni parité de thèmes.

| Outil ou jeu | Score | Signaux et point à vérifier |
| --- | --- | --- |
| Couleurs | 3/5 | P,T,A. Examiner contrôles de ColorPicker, clavier, zones tactiles et séparer couleurs générées des valeurs d’interface. |
| QR | 4/5 | P,T,E,A. Bouton, carte et champ partagés. Vérifier le flux avec aperçu en colonne étroite et les couleurs du résultat personnalisable. |
| Compression image | 4/5 | P,T,E,A. Examiner états de sélection et progression, test mobile du dépôt de fichiers. |
| Conversion image | 5/5 | P,T,E,A,R. Boutons, Card et NativeInput, erreurs et listes adaptatives. Vérifier téléchargement et suppression au clavier. |
| Fusion PDF | 4/5 | P,T,E,A. Contrôles partagés et déplacements nommés. Vérifier annonce de réordonnancement, RTL et titres longs. |
| Listes cadeaux | 4/5 | P,T,E,R. Formulaires et variantes publiques, contrôler libellés, erreur annoncée et focus après réservation. |
| Tetris | 4/5 | P,T,E,R. Réglages partagés, styles de HUD et actions tactiles spécifiques. Vérifier nommage et focus au retour du jeu. |
| Cards | 3/5 | P,E,R. Réglages partagés, palette et mouvement dédiés. Vérifier commandes, modales et états de chargement. |
| Clicker Burger | 3/5 | P,E,R. UI de jeu avec Sheet local et CSS dédié. Vérifier clavier, contraste et cadence d’annonce. |
| Terrain de jeu accueil | 2/5 | T,R. Pinceau et palette sémantiques, interaction physique sur mesure. Vérifier parcours clavier et mode mouvement réduit. |

## Améliorations compatibles

- Priorité au focus visible, cibles tactiles, erreurs associées et boutons d’icône nommés. Vérifier le contraste WCAG AA des textes et des contrôles dans chaque thème, avec mesures sur la vitrine, puis sur les écrans réels.
- Documenter default, hover, focus, active, disabled, loading et error par primitive. Loading/error relèvent parfois de la composition. Vérifier le comportement comparé Primer, Mehdi et Adobe sous flag.
- Remplacer les marges, placements et icônes directionnels d’interface par des équivalents logiques quand la direction linguistique l’exige. Ne pas inverser les règles de déplacement du jeu. `DocumentLocale` applique la direction après rendu. Vérifier premier affichage et navigation SPA en arabe.
- Tester Noto Sans SC avec texte mixte, retour à la ligne et caractères larges, ainsi que Noto Sans Arabic, zoom, dark mode, mouvement réduit et mobile. Garder les noms des tokens sémantiques et documenter les doublons de valeur avant consolidation.
- Remplacer les actions locales standard par Button, les overlays standards par Dialog ou Sheet et les champs génériques par Input ou NativeInput. Conserver les commandes de gameplay qui ont un contrat de répétition distinct. Promouvoir un pattern de progression ou d’état vide dans le DS seulement après preuve d’au moins deux usages compatibles.

## Ruptures éventuelles

Le Sheet Burger et les primitives de réglages méritent une comparaison avec les contrats du DS avant convergence. Si une prop ou une primitive publique doit disparaître, documenter l’équivalent et marquer `@deprecated`, migrer tous les appelants avec comparaison visuelle et clavier, puis soumettre le fichier exact à validation de suppression. Aucune suppression de ce type proposée dans le plan actuel.
