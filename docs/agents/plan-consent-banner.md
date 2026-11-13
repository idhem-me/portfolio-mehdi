# Plan — bannière de consentement dans la zone de contenu

## Demande

La bannière de cookies doit remplir la largeur de la zone de contenu sans recouvrir la navigation latérale.

## Proposition validée le 13 novembre 2026

- Conserver la bannière fixée en bas de l’écran pour qu’elle reste visible pendant la navigation.
- Limiter sa largeur à la zone de contenu : son bord de départ suit la largeur de la sidebar lorsqu’elle est ouverte ou réduite, en s’appuyant sur l’état partagé de la sidebar.
- Utiliser les propriétés logiques de début/fin afin de préserver le comportement en RTL.
- Sur mobile, la bannière prend la largeur du viewport ; le panneau de navigation ouvert reste au-dessus.
- Garder le contenu, les libellés traduits, le comportement de consentement et les styles du design system existants.

## Périmètre

- `src/components/analytics/consent-banner.tsx`

Aucune route, URL, traduction, donnée, migration ou dépendance ne change. La bannière est une composition du shell, pas une primitive du design system ; aucune nouvelle démo Playground n’est prévue.

## Vérifications

- Lint, typecheck, build et tests ciblés selon les commandes disponibles dans le dépôt.
- Vérifier le rendu avec la sidebar ouverte et réduite, ainsi qu’en mobile avec le menu fermé et ouvert.
