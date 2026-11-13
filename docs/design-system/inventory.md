# Inventaire du design system

## Sources et tokens

- `src/app/globals.css` définit les surfaces et textes sémantiques (background, foreground, card, popover), actions (primary, accent, secondary, destructive), feedback (success, warning), contours (border, input, ring) et la famille sidebar. `:root`, `.dark` et `@theme inline` alimentent Tailwind.
- Densité et espacements interactifs via `--control-height-*`, `--control-text-*`, `--menu-*`, `--sidebar-*` et `--sheet-*`. Les cibles mobiles principales passent à 44 px sous 768 px. Les espacements de composition suivent Tailwind.
- Familles `--radius-*` et ombres d’élévation via tokens/classes. Les effets de l’accent et des jeux mêlent transitions, keyframes et valeurs locales. Préserver l’identité des effets propres aux jeux lors des migrations.
- Google Sans (Sobre), Open Sans (Liquid Glass), Nunito Sans (Frutiger Aero), Bricolage Grotesque (Fun), Geist Mono, Noto Sans SC et Noto Sans Arabic sont chargées depuis `src/app/fonts/` avec `next/font/local`. Les fichiers WOFF2 de Google Sans et Nunito Sans proviennent de `@fontsource-variable/google-sans@5.3.2` et `@fontsource-variable/nunito-sans@5.3.0`. Leurs licences OFL sont incluses. Les sous-ensembles Latin étendu complètent les familles latines ; les fontes CJK et arabe conservent des replis système. Le token `--font-sans` est défini par thème et le thème clair/sombre suit l’OS via next-themes.
- `DesignSystemProvider` et `design-system.css` appliquent Sobre, Fun, Frutiger Aero et Liquid Glass aux primitives Radix/Shadcn. Les vitrines `/playground` et `/playground/design-systems` sont la référence visuelle. Le [guide DS existant](../designsystem.md) détaille tokens et variantes.

- `fun.css` définit les palettes clair et sombre, le relief et le mouvement par tokens. Les démos réelles du Playground couvrent les contrôles et surfaces concernés, avec une composition de référence à `#fun`. Les palettes et effets de Frutiger Aero et Liquid Glass sont présentés à `#frutiger-aero` et `#liquid-glass`.

## Composants et conventions d’usage

| Surface | Contrat et états à documenter en vitrine | Usage |
| --- | --- | --- |
| Breadcrumb | Liens parents, séparateurs et page courante. | Utiliser des liens localisés et signaler la page courante avec `aria-current="page"`. |
| Button | `variant` default/primary, outline, secondary, ghost, destructive, accent, link. `size` default, xs/sm/lg et quatre formats icon. `asChild`, disabled, focus, hover, active et invalid selon variante. | Une action principale par bloc. Nom accessible pour icône seule. Pour attente, désactiver l’action et communiquer la progression. |
| Input et Select | Attributs natifs ou primitives Radix, value/defaultValue selon surface, disabled et invalid. Le bouton de Select déclenche une liste d’options. | Label explicite, aide et erreur associées. Réserver NativeInput au fichier et aux entrées HTML spécialisées. |
| Textarea et NativeCheckbox | Zone multiligne avec valeur native, erreur et aide. Case native avec toute la ligne du label activable. | Associer label et description au champ. Voir la composition `#textarea`. |
| Dialog et Sheet | Root contrôlé ou non, trigger, content, title et description. Overlay, focus, fermeture clavier. Sheet ajoute le placement. | Conserver titre accessible et retour du focus. Éviter un overlay local pour un dialogue ordinaire. |
| DropdownMenu, ChoiceMenu et DateRangeSelect | Ouverture, valeur, items et état actif. Adaptations de fournisseur selon le composant. | Séparer menu d’actions et choix de valeur, vérifier sélection et clavier. |
| Tabs et Accordion | Valeur et item, navigation clavier, état sélectionné ou ouvert. | Associer déclencheur et panneau. Ne pas cacher des actions urgentes derrière un onglet. |
| Switch et Slider | Contrôles de valeur, callbacks, bornes et pas pour Slider, disabled et focus. | Donner un nom et une valeur perceptible. Tester clavier et tactile. |
| Card, Badge et Separator | Slots de contenu et variantes selon primitive. Badge indique un état, Card organise la lecture. | Éviter la couleur seule pour exprimer un statut. Employer une vraie action si la carte est interactive. |
| Avatar, Skeleton, Toast et Tooltip | Image et fallback, chargement, notification et description contextuelle. | Donner un texte accessible si l’avatar porte une identité. Tooltip complète le nom accessible. Annoncer chargement et erreurs critiques. |
| Sidebar, SidebarButton, SidebarTrigger et Switcher | Contexte ouvert/réduit, état actif, mobile et fournisseur DS. | Vérifier navigation et ordre du focus à sept locales. Tester icônes et placement en RTL. |
| ScopedTheme et NativeControls | Thème local et contrôles HTML spécialisés. | Garder la sémantique et les attributs HTML. Préserver contraste et états si le thème est forcé. |

Les adaptateurs de `src/components/design-system/` comprennent aussi le bouton local de base et le registre de flags. Les réglages `components/games/game-settings` composent des contrôles de jeu partagés. Préférer une composition de primitives pour le chrome, avec rendu de scène propre à la feature. La parité de chaque prop et de chaque état entre fournisseurs reste à vérifier en navigateur.

- Palette catégorielle de scène : `--tetris-piece-*`, `--tetris-material-intensity`, `--tetris-board-surface` et `--tetris-ghost-*`. Consommée par Tetris, avec une démo publique générique `#categorical-palette`.

- La famille `--aero-outline-*` définit la matière, l’encre et le contour de Button Outline. Démo `#button`, avec et sans raccourci.
