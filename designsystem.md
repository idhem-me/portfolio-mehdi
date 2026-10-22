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

## Button — variante `accent`

- Token : `bg-accent` / `text-accent-foreground`
- Radius max : `rounded-full`
- Paddings agrandis (overrides par taille via compound variants)
- États : default, hover (fond un peu plus sombre), active, focus-visible (`ring-accent`), disabled (opacity base)
- Hover : animation de surbrillance (bandeau dégradé blanc en `::before`)
