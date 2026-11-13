# Dimensions globales des badges

La primitive `src/components/ui/badge.tsx` est partagée par le site et les six variantes de `/playground#badge`. Elle utilise actuellement une police de 12 px, une hauteur de 20 px et un padding horizontal de 8 px, ramené à 6 px du côté de certaines icônes.

## Plan à valider

1. Appliquer les utilitaires du design system `text-sm`, `h-6` et `px-1.5` à la primitive pour obtenir une police de 14 px, une hauteur de 24 px et un padding horizontal de 6 px de chaque côté. Retirer les règles de padding redondantes pour les icônes.
2. Aligner la taille du texte des badges du HUD Tetris sur la primitive. Garder la hauteur automatique du badge de conversion d’image, dont le message peut passer sur plusieurs lignes.
3. Documenter les dimensions et cette exception dans le relevé de couverture. Vérifier les six variantes via la démo existante, en densités Ordinateur et Mobile, puis contrôler les libellés longs et le HUD Tetris. Lancer lint, typecheck, build et tests.

Branche `codex/badge-dimensions`. Aucun fichier à supprimer et aucun texte d’interface à ajouter.

Plan validé et appliqué. Le build local est bloqué par la résolution DNS de `fonts.googleapis.com`, nécessaire à Google Sans et Nunito Sans dans la version actuelle de `src/app/layout.tsx`.
