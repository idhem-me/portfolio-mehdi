# Désactiver Clicker Burger et retirer la connexion de Jeux

Date : 13 novembre 2026. Phase 4 : validé par le propriétaire le 13 novembre 2026, avec publication Tetris/Pokémon uniquement et aperçu local des jeux non publiés.
Branche : `codex/games-publication-and-auth`.

## Inventaire et décisions proposées

- `src/features/clicker-burger/flags.ts` active actuellement le jeu et sa publication. Passer les deux indicateurs à `false` retire la carte via `src/lib/content.ts` et la route du sitemap via `src/app/sitemap.ts`. La page et le proxy disposent déjà d'un blocage lorsque le jeu est désactivé.
- Le plan de publication validé fixe la réponse des routes Burger en production à 404 ; le chemin du jeu reste identique pour l’aperçu local.
- `src/app/[locale]/(site)/jeux/page.tsx` affichait `PlayerProfileButton` dans `PlayerIdentityProvider`. Retirer ce bloc et ses deux imports retire la connexion globale du catalogue dans toutes les langues. Les contrôles de compte facultatifs propres à Tetris restent disponibles pour ses scores.
- Aucun fichier supprimé, aucune migration, aucun nouveau token de design. Le moteur Burger et ses sauvegardes sont conservés.

## Périmètre validé et implémenté

Le retrait de la connexion globale du catalogue est implémenté dans `src/app/[locale]/(site)/jeux/page.tsx`. La désactivation Burger et la politique d'accès local/production sont suivies dans [le plan de publication](plan-games-publication-policy.md). Aucun changement d'URL n'a été fait ; les redirections historiques restent intactes.

## Validation prévue

Lire le guide Next.js local sur les redirections avant de coder. Vérifier lint, typecheck, build, tests généraux, Burger, Cards et sécurité. Vérifier les anciennes URL Burger sans préfixe et dans les sept langues, l'absence de carte et de connexion dans Jeux, et l'absence de Burger dans le sitemap. Documenter tout blocage d'environnement.

## État

Le code du catalogue et sa politique de publication ont été modifiés. Le bouton global de profil a été retiré ; l'identité facultative de Tetris est conservée. Vérifications complètes consignées dans le plan de publication.
