# Plan — corriger le fond qui dépasse du tableau des sessions

## Constat
La page `/backoffice/sessions` entoure le tableau d’un conteneur avec bordure arrondie, mais le fond de son en-tête sticky peut déborder visuellement des coins supérieurs.

## Changement proposé
- Modifier uniquement `src/features/backoffice/ui/sessions.tsx` pour découper le contenu du conteneur du tableau au rayon de sa bordure (ou appliquer le découpage au bon élément après vérification du comportement sticky).
- Préserver la bordure, les rayons, l’en-tête sticky et le rendu responsive existants.
- Garder intactes les modifications locales déjà présentes dans ce fichier, notamment celles liées au sélecteur de dates.

## Vérification
- Inspecter le diff ciblé et vérifier le rendu de la page si un navigateur de développement est disponible.
- Selon les règles du dépôt, lancer lint, typecheck, build et les tests pertinents; consigner toute commande bloquée par l’environnement.

## Suppressions et risques
Aucune suppression de fichier. Risque limité à l’interaction entre le découpage et l’en-tête sticky; vérifier que l’en-tête reste visible pendant le défilement.
