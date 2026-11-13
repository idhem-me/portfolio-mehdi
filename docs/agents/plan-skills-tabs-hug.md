# Largeur des onglets Compétences

Dans `src/features/cv/ui/skills-tabs.tsx`, la classe `w-full` de `TabsList` remplace la largeur intrinsèque `w-fit` de la primitive partagée.

Après validation, remplacer `w-full` sur la liste par `max-w-full` et conserver son retour à la ligne. La liste suivra la largeur de ses libellés et pourra se replier sur plusieurs lignes sur les écrans étroits. Le panneau garde la largeur disponible. La démo existante `/playground#tabs` montre déjà la largeur intrinsèque de la primitive.

Vérifier le rendu sur desktop et mobile, y compris les libellés longs et le sens RTL, puis lancer lint, typecheck, build et tests. Aucun fichier à supprimer.

Branche dédiée `codex/skills-tabs-hug`.

Plan appliqué. Les onglets reprennent le token de cible tactile du design system et la liste adopte une hauteur automatique pour accueillir plusieurs rangées. Le build local est bloqué par la résolution DNS de `fonts.googleapis.com`.
