# Corriger la photo sur la page « À propos »

Date : 13 novembre 2026. Phase 4 : en attente de validation explicite.
Branche : `codex/fix-about-photo`.

## Inventaire

- La page concernée est `src/app/[locale]/(site)/a-propos/page.tsx`.
- Elle rend la photo avec `ActiveThemeImage`, qui sélectionne le fichier clair ou sombre après hydratation et transmet une URL avec un paramètre `?v=20261023-2`.
- Les fichiers `public/img/photos/moi/mehdi-light.png` et `mehdi-dark.png` existent, sont suivis par Git et sont des PNG valides de 260 × 400 pixels.
- La capture montre le texte alternatif du navigateur et l’icône d’image cassée. Elle ne fournit pas l’erreur réseau exacte ; elle ne permet donc pas de distinguer une réponse 404, un échec de l’optimiseur d’image ou une erreur de déploiement/cache.
- La page Contact réutilise les mêmes URL avec paramètre de version.

## Correction proposée

Rendre le chargement de la photo de la page À propos plus robuste en utilisant directement l’image locale choisie pour le thème avec une URL sans paramètre de version, tout en gardant le texte alternatif, les dimensions et le rendu actuel. Vérifier également si Contact doit recevoir la même correction puisque ses URL sont identiques. Ne pas remplacer les fichiers photo ni modifier le contenu traduit.

## Périmètre proposé après validation

Modifier le chargement d’image sur À propos et, si nécessaire pour cohérence, Contact. Mettre à jour `AGENTS.md` si la résolution révèle une règle réutilisable. Aucun fichier supprimé, aucune URL publique modifiée et aucun nouveau texte visible.

## Validation prévue

Consulter le guide local Next.js applicable à `Image` avant modification. Vérifier que les fichiers sont servis et que la page À propos rend effectivement la photo en clair et en sombre. Si l’erreur réseau persiste, relever sa réponse exacte avant d’étendre le changement.

## État

Inventaire terminé. Aucun code applicatif modifié. Les modifications locales préexistantes ont été préservées. Vérifications applicatives non lancées à ce stade documentaire.
