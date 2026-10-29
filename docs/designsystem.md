# Design System

## Couleurs (tokens)

Toutes les couleurs sémantiques sont des design tokens dans `src/app/globals.css` (`:root` + `.dark`), exposées à Tailwind via `@theme inline`.

| Token | Rôle |
|-------|------|
| `--background` / `--foreground` | Fond et texte de page |
| `--card` / `--popover` | Surfaces surélevées |
| `--primary` | Action principale neutre |
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

Tokens de sizing interactif dans `src/app/globals.css`. Breakpoint mobile : **&lt;768px** (aligné sur `useIsMobile` / `max-width: 767px`).

| Token | Desktop | Mobile |
|-------|---------|--------|
| `--control-height-*` (+ icons) | 24–36px | **44px** (`2.75rem`) |
| `--control-text` / `--control-text-xs` | 14px / 12px | **16px** |
| `--menu-item-min-height` / `--menu-item-text` | auto / 14px | **44px** / **16px** |
| `--sidebar-menu-height` / `--sidebar-menu-text` | 32px / 14px | **44px** / **16px** |
| `--sidebar-width-mobile` | `18rem` | **plein viewport** (`100svw`) |
| `--sheet-width-mobile` / `--sheet-max-width` | 75% / 24rem | 100% / none |

Overrides (**dans `@layer base`**, avec les defaults desktop) — Tailwind v4 fusionne les règles adjacentes dans ce layer ; des defaults unlayered battraient toujours les overrides :

- `@media (max-width: 767px)` sur `:root:not([data-density="desktop"])` → valeurs mobile
- `[data-density="mobile"]` → force mobile (playground, sans resize)
- `[data-density="desktop"]` → force desktop même sous 768px

Les composants (`Button`, `DropdownMenu`, `SidebarMenuButton`, `Sheet`, `Tabs`, `Input`) consomment ces tokens via `h-(--control-height)`, `text-[length:var(--control-text)]`, etc. Sur `/playground`, un toggle synchronise `document.documentElement.dataset.density`.

## Button — variante `accent`

- Token : `bg-accent` / `text-accent-foreground`
- Radius max : `rounded-full`
- Paddings agrandis (overrides par taille via compound variants) ; hauteurs via `--control-height-accent*` (≥ 44px en mobile)
- États : default, hover (fond un peu plus sombre), active, focus-visible (`ring-accent`), disabled (opacity base)
- Hover : brillance texturée (`accent-shine-sweep`, −5°, droite → gauche) + léger lift/glow ; désactivé si `prefers-reduced-motion`

## Button — variante `primary`

`primary` est un alias explicite et compatible de `default` : mêmes tokens `--primary` / `--primary-foreground`, hover, focus, active et disabled. Il sert notamment à Enregistrer dans Profil joueur. `accent` reste réservé aux actions utilisant la couleur de marque ; les boutons photo utilisent `secondary` avec la taille `sm`, en conservant les cibles tactiles mobiles.


### Couleurs sémantiques du pinceau

Le pinceau de l’accueil utilise `primary`, `accent`, `warning`, `success` et
`destructive` (libellé « Danger »). `warning` et `success` possèdent des variantes
claires et sombres ainsi que les tokens `warning-foreground` et
`success-foreground`. Les traits conservent leur rôle sémantique lors du
changement de thème. Leur épaisseur est fixe : 12 px CSS, extrémités rondes.

### Papier de l’accueil

Le fond de l’accueil reproduit un papier Seyès en CSS : cellules de 28 px et
interlignes de 7 px, ancrés en haut à gauche de la surface principale, y compris
pendant le chargement. `--home-paper-line` et `--home-paper-rule` dérivent du gris
`--muted-foreground`. `--home-paper-margin` dérive du token danger
`--destructive`, mélangé au fond pour être clair en light et sombre en dark.
La marge rouge est à 56 px du bord gauche sur desktop, 14 px sous 768 px ; le
quadrillage conserve sa taille sur mobile. Ces tokens sont indépendants du
papier des aperçus de projets (`--paper-grid`).
