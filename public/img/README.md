# Assets images

Place ici les fichiers à intégrer dans le site.

## Structure

- `logos/` — logos SVG/PNG (entreprises, outils, marques)
- `photos/` — photos (avatar, portraits, etc.)
- racine `img/` — autres visuels ponctuels

## Usage dans le code

- Logo : `/img/logos/nom-du-fichier.svg`
- Photo : `/img/photos/avatar.jpg`

Formats OK : `.svg`, `.png`, `.jpg`, `.webp`, `.gif`

## Sécurité SVG

Les fichiers `.svg` sous `public/` ne sont **pas** servis bruts. Une rewrite Next.js les passe par `/api/assets/svg/...`, qui :

1. refuse les chemins avec traversal (`..`, null bytes, etc.) ;
2. sanitise le markup (scripts, event handlers, URIs dangereuses, métadonnées) ;
3. renvoie une CSP restrictive (`script-src 'none'; sandbox`).

Pour du SVG **inline** dans React, utiliser le composant `SafeSvg` (`src/components/media/safe-svg.tsx`) plutôt que `dangerouslySetInnerHTML` brut.

Ne pas déposer de SVG provenant de sources non fiables sans vérification. Préférer les logos vectoriels simples (paths) sans scripts ni liens externes.
