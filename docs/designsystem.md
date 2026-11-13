# Design System

## Multi design systems

Le sélecteur de la barre latérale propose Sobre, Fun et Frutiger Aero en production, avec leurs démos dans le catalogue et le comparatif. Les quatre thèmes partagent les primitives Shadcn et Radix. Liquid Glass reste réservé à `npm run dev`.

| Valeur | Thème | Tokens |
|--------|-------|--------|
| `mehdi` | Sobre | Palette locale dans `globals.css` |
| `fun` | Fun | Palettes et relief dans `fun.css` |
| `frutiger-aero` | Frutiger Aero | Dégradés et reflets nacrés dans `frutiger-aero.css` |
| `liquid-glass` | Liquid Glass | Verre teinté et reflets dans `liquid-glass.css` |

Le registre `DESIGN_SYSTEMS` alimente le sélecteur et le comparatif. Le choix est enregistré dans le navigateur sous `portfolio-design-system` et appliqué à la racine du document avant le premier affichage. Sobre sert de repli. Le réglage clair ou sombre reste indépendant. Les portails du comparatif restent dans le périmètre de leur colonne.

## Fun

Fun suit le thème clair ou sombre du site. Sobre reste le style initial. La police latine de Fun est Bricolage Grotesque, définie par le token `--font-sans` dans `fun.css`. Les portées de l’accueil et de la navigation héritent du token global ; les aperçus forcés du Playground gardent leur propre police. Les locales arabe et chinoise conservent leurs familles de police dédiées, et la police monospace reste indépendante. Le comparatif expose `--font-sans` pour vérifier la valeur propre à chaque thème. Les palettes de Fun sont définies dans `src/components/design-system/fun.css` et alimentent les tokens sémantiques des surfaces, textes, liens, bordures, états et focus. Les valeurs de couleur restent dans les définitions de tokens. Les actions principales et secondaires utilisent respectivement `--fun-yellow` et `--fun-orange` avec `--fun-on-action`. La variante Accent, les liens et la sélection utilisent le violet de la palette active. La variante Accent est visible dans le comparatif.

Les contours des contrôles et surfaces utilisent `--fun-control-border` et `--fun-surface-border`. Les ombres `--fun-control-shadow`, `--fun-surface-shadow` et `--fun-pressed-shadow` distinguent relief et pression. Les tokens de mouvement commandent le soulèvement et l’enfoncement des boutons. En mouvement réduit, la pression reste perceptible par l’ombre. Le focus conserve un contour visible, y compris sur les cartes de navigation.

[La démo Fun](/playground#fun) montre une carte, un formulaire, deux actions et un dialogue. Les états des primitives restent visibles à leurs ancres et les nuanciers du comparatif suivent le réglage clair ou sombre du site.

## Frutiger Aero et Liquid Glass

[Frutiger Aero](/playground#frutiger-aero) utilise Open Sans (400/600, italique pour les descriptions), une encre bleu nuit et des surfaces en verre liquide. Les boutons bleu eau et émeraude utilisent quatre stops à 0/49/50/100 %, un biseau, une lueur au survol et une pression de 200 ms. Les champs et zones de texte sont creusés ; cartes, navigation et dialogues partagent les tokens de réfraction et de verre saturé. Les variantes invalides et désactivées restent visibles dans la composition. Les polices arabe, chinoise et monospace restent dédiées.

Les tokens `--aero-button-sheen`, `--aero-panel-sheen`, `--aero-panel-shadow` et `--aero-input-shadow` sont montrés dans le comparatif. Les valeurs de matière, contours, rayons, typographie et mouvement sont définies dans `frutiger-aero.css`. Les portées locales et les portails conservent leur thème. Une surface opaque remplace le verre lorsque le flou est indisponible ou la transparence réduite est demandée.

L'accueil Aero remplace toutes les couches de papier par `--aero-home-backdrop`, avec les images locales `/img/backgrounds/bg-aero-frutiger-light.png` et `/img/backgrounds/bg-aero-frutiger-dark.png` sélectionnées via `--aero-home-image` selon le mode clair/sombre. Le voile reste transparent pour préserver les couleurs des deux images ; un dégradé sert de repli. Ce changement est limité à l'accueil lorsque le thème Aero est actif.

[Liquid Glass](/playground#liquid-glass) garde les surfaces de lecture opaques et applique un verre teinté à la navigation et aux éléments superposés. Le contour, le reflet et le flou du verre sont pilotés par des tokens. Une surface opaque prend le relais si le flou est indisponible ou que la transparence réduite est demandée. La pression dure 180 ms.

Les deux thèmes respectent le mouvement réduit et proposent une composition de démonstration avec carte, champ, actions et dialogue. Les palettes propres aux jeux et les couleurs des contenus créés ou exportés restent distinctes du thème d’interface.

## Couleurs (tokens)

Toutes les couleurs sémantiques sont des design tokens dans `src/app/globals.css` (`:root` + `.dark`), exposées à Tailwind via `@theme inline`.

| Token | Rôle |
|-------|------|
| `--background` / `--foreground` | Fond et texte de page |
| `--card` / `--popover` | Surfaces surélevées |
| `--primary` | Action principale neutre |
| `--primary-inverse` | Surface de démonstration du Playground, issue de la palette du thème actif |
| `--secondary` / `--muted` | Surfaces secondaires / atténuées |
| `--accent` | **Couleur marque** `#0071E3` (`oklch(0.563 0.193 256.156)` light ; légèrement plus clair en dark) |
| `--accent-foreground` | Texte sur accent (blanc) |
| `--destructive` | Erreurs / actions destructives |
| `--border` / `--input` / `--ring` | Contours et focus |
| `--sidebar-*` | Tokens dédiés à la sidebar (indépendants de `--accent`) |

Utiliser les utilitaires Tailwind (`bg-accent`, `text-accent-foreground`, etc.) — jamais de hex en dur dans les composants.

## Thème (light / dark)

- Classe `.dark` sur `<html>` via `next-themes` (`ThemeProvider` dans `src/app/layout.tsx`)
- Défaut : `system` (suit l’OS) ; toggle binaire light ↔ dark dans le footer sidebar (`ThemeToggle`, au-dessus de « Me contacter »)
- `color-scheme: light` / `dark` sur `:root` / `.dark` pour scrollbars et contrôles natifs
- En dark, `--sidebar-primary` suit l’accent marque (pas le violet Shadcn par défaut)

## Densité / Touch

Tokens de sizing interactif dans `src/app/globals.css`. Breakpoint mobile : **&lt;768px** (aligné sur `useIsMobile` / `width < 768px`).

| Token | Desktop | Mobile |
|-------|---------|--------|
| `--control-height-*` (+ icons) | 24–36px | **44px** (`2.75rem`) |
| `--touch-target-size` | 0 px (taille intrinsèque du contrôle) | **44 px** de zone active |
| `--control-text` / `--control-text-xs` | 14px / 12px | **16px** |
| `--menu-item-min-height` / `--menu-item-text` | auto / 14px | **44px** / **16px** |
| `--sidebar-menu-height` / `--sidebar-menu-text` | 32px / 14px | **44px** / **16px** |
| `--sidebar-width-mobile` | `18rem` | **plein viewport** (`100svw`) |
| `--sheet-width-mobile` / `--sheet-max-width` | 75% / 24rem | 100% / none |

Overrides (**dans `@layer base`**, avec les defaults desktop) — Tailwind v4 fusionne les règles adjacentes dans ce layer ; des defaults unlayered battraient toujours les overrides :

- `@media (width < 768px)` sur `:root:not([data-density="desktop"])` → valeurs mobile
- `[data-density="mobile"]` → force mobile (playground, sans resize)
- `[data-density="desktop"]` → force desktop même sous 768px

Les composants (`Button`, `DropdownMenu`, `SidebarMenuButton`, `Sheet`, `Tabs`, `Input`) consomment ces tokens via `h-(--control-height)`, `text-[length:var(--control-text)]`, etc. Sur `/playground`, le mode Auto suit le viewport. Les modes forcés appliquent `data-density` à la vitrine et à ses portails. La navigation du site conserve sa densité responsive.

Le registre de couverture associe chaque module du DS à une démo ou à une exception d’infrastructure. `npm test` contrôle sa couverture. Les tests navigateur contrôlent les ancres, les cibles et le retour du focus. Le [relevé des composants locaux](design-system/playground-local-components.md) conserve l’historique. La page `/playground/local-components` apparaît en développement local quand il reste des tickets à traiter.

## Button — variante `accent`

- Token : `bg-accent` / `text-accent-foreground`
- Radius max : `rounded-full`
- Paddings agrandis (overrides par taille via compound variants) ; hauteurs via `--control-height-accent*` (≥ 44px en mobile)
- États : default, hover (fond un peu plus sombre), active, focus-visible (`ring-accent`), disabled (opacity base)
- Hover : brillance texturée (`accent-shine-sweep`, −5°, droite → gauche) + léger lift/glow ; désactivé si `prefers-reduced-motion`

## Button — variante `primary`

`primary` est un alias explicite et compatible de `default` : mêmes tokens `--primary` / `--primary-foreground`, hover, focus, active et disabled. Il sert notamment à Enregistrer dans Profil joueur. `accent` reste réservé aux actions utilisant la couleur de marque ; les boutons photo utilisent `secondary` avec la taille `sm`, en conservant les cibles tactiles mobiles.


### Couleurs sémantiques du pinceau

Le bouton Accent du pinceau affiche l’icône Brush de Lucide. Le curseur de dessin utilise le SVG du pinceau et reflète la couleur choisie. « Quitter le pinceau » utilise le bouton Principal et reste centré à côté du pinceau dans le sens de lecture. La [démo PaintColor](/playground#paint-color) réunit ces boutons et les pastilles. Dans Fun, le trait Principal utilise la couleur du texte, ce qui le distingue de l’Accent violet.

Le pinceau de l’accueil utilise `primary`, `accent`, `warning`, `success` et
`destructive` (libellé « Danger »). `warning` et `success` possèdent des variantes
claires et sombres ainsi que les tokens `warning-foreground` et
`success-foreground`. Les traits conservent leur rôle sémantique lors du
changement de thème. La palette reste accessible pendant le dessin : changer de
couleur garde le pinceau actif et applique le token aux poils du curseur et de
l’outil, sans recolorer les traits existants. Le manche conserve ses couleurs.
Leur épaisseur est fixe : 12 px CSS, extrémités rondes.

### Papier de l’accueil

Le fond de l’accueil reproduit un papier Seyès en CSS : cellules de 28 px et
interlignes de 7 px, ancrés en haut à gauche de la surface principale, y compris
pendant le chargement. `--home-paper-line` et `--home-paper-rule` dérivent du gris
`--muted-foreground`. `--home-paper-margin` dérive du token danger
`--destructive`, mélangé au fond pour être clair en light et sombre en dark.
La marge rouge est à 56 px du bord gauche sur desktop, 14 px sous 768 px ; le
quadrillage conserve sa taille sur mobile. Ces tokens sont indépendants du
papier des aperçus de projets (`--paper-grid`).

## Modale de réglages et tableau

- `SettingsModal` compose `Dialog` avec un titre, une description, une fermeture et un corps défilant. Utiliser les tokens `--settings-modal-*` pour la géométrie et les niveaux d’affichage. Choisir la variante `center` pour une fenêtre centrée ou `right` pour un panneau coulissant à droite. En mode Auto, les deux prennent tout l’écran sous 768 px. Le panneau droit réutilise les tokens de largeur de `Sheet` et respecte la préférence de mouvement réduit. Fournir le déclencheur ou sa référence pour restituer le focus.
- `Table`, `TableHeader`, `TableRow`, `TableHead` et `TableCell` conservent la sémantique HTML. `TableSortButton` rend l’action de tri. Poser `aria-sort` uniquement sur l’en-tête de la colonne triée et laisser la logique de données au parent.
- Réutiliser les tokens sémantiques du DS pour les couleurs, la typographie, les espacements et les tailles tactiles. Créer un token dédié lorsqu’une dimension a une signification commune et doit varier par densité, et montrer son effet dans le Playground.
