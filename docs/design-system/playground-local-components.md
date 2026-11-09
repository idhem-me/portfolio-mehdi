# Composants codés localement

La page `/playground/local-components` présente le statut des écarts et les liens vers les démos en développement local. Les anciennes adresses publiques redirigent temporairement vers le catalogue de leur langue.

| Ticket | Statut | Résolution ou suivi |
| --- | --- | --- |
| LOCAL-01 · Pinceau | Corrigé | [Pastilles et boutons](../../src/components/creative/paint-tool.tsx) dans la démo `#paint-color`. |
| LOCAL-02 · Cadeaux, champs spécialisés | Corrigé | [Textarea](../../src/components/ui/textarea.tsx) partagée et [cases natives](../../src/components/design-system/native-controls.tsx) avec label cliquable. La démo `#textarea` montre aide, erreur et texte multiligne. |
| LOCAL-03 · Cadeaux, actions | Corrigé | Le [bouton avatar](../../src/features/gift-lists/ui/creator.tsx) utilise la taille icône large et le [lien de création](../../src/features/gift-lists/ui/public.tsx) la variante Link. La démo `#gift-actions` présente le menu et le lien. |
| LOCAL-04 · Backoffice, sessions | Corrigé | [Tri et ligne interactive](../../src/components/ui/table.tsx) partagés. La démo `#table` ouvre un détail fictif au clavier. |
| LOCAL-05 · Générateur de couleurs | Corrigé | [Sélecteur](../../src/features/color-generator/ui/ColorPicker.tsx) dans `#color-picker`, [cartes](../../src/features/color-generator/ui/SwatchesGrid.tsx) dans `#swatches`. Le fond des cartes affiche la couleur générée. Les contours et le focus utilisent les tokens du DS. |
| LOCAL-06 · Études de cas | Corrigé | [Carrousel](../../src/features/case-study/ui/case-study-slider.tsx) avec commandes tactiles et clavier, [visionneuse](../../src/features/case-study/ui/image-lightbox.tsx) avec zoom, déplacement et retour du focus. La démo `#case-study` couvre aussi le glossaire. |
| LOCAL-07 · Réglages de jeu | Corrigé | `#settings-modal` montre le bouton, le curseur natif, le choix segmenté et [l’interrupteur](../../src/components/games/game-settings/primitives/SettingsToggleRow.tsx) dans un panneau fictif. |
| LOCAL-08 · Tetris, suivi interne | Suivi interne | Plateau et gestes propres à la scène couverts par les tests du jeu. |
| LOCAL-09 · Primitives interactives | Corrigé | Le [Switch](../../src/components/ui/switch.tsx) et le [Slider](../../src/components/ui/slider.tsx) séparent dimensions visuelles et dimensions d’activation. Démos `#switch` et `#slider`. |
| LOCAL-10 · Jeux masqués, suivi interne | Suivi interne | Les contrôles et gestes spécifiques sont recensés par module dans l’[inventaire interne](playground-coverage.md). |
| LOCAL-11 · Pokémon | Suivi dans la fonctionnalité | Le [catalogue](../../src/features/pokemon/catalogue.tsx) réutilise le tableau. La [scène](../../src/features/pokemon/playground.tsx) garde ses interactions propres. |

Les termes du glossaire restent dans le flux du texte. Ils dérogent à la taille des contrôles autonomes. Les boutons du carrousel, du dialogue et les autres contrôles autonomes reprennent les cibles du DS. Les compositions métier, logos et effets de scène restent inventoriés dans la [couverture générale](playground-coverage.md).
