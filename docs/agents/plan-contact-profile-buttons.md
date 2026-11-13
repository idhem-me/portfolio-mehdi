# Boutons de profil sur la page Contact

## Inventaire

La page Contact des sept langues utilise le même composant de route. Sa carte de profil contient la photo, le nom et la ligne métier et villes. Les liens LinkedIn, Fiverr et Malt sont affichés après les sections Email et Message. Ils utilisent le bouton du design system, une icône de plateforme et un événement de clic propre à chaque destination. Le suffixe traduit utilise la clé `contact.viewProfile` dans les sept langues.

## Plan à valider

1. Dans `src/app/[locale]/(site)/contact/page.tsx`, déplacer les trois boutons dans la carte de profil, juste sous la ligne métier et villes. Les afficher sur une rangée quand la largeur le permet et autoriser le retour à la ligne sur mobile.
2. Dans `src/components/analytics/contact-ctas.tsx`, afficher uniquement LinkedIn, Fiverr et Malt. Conserver leurs icônes, leurs liens et le suivi des clics.
3. Retirer la clé devenue inutilisée des sept fichiers `messages/{locale}.json`. Aucun fichier à supprimer.
4. Vérifier la carte sur desktop et mobile, l’ordre de tabulation, les cibles tactiles et le rendu arabe. Lancer le lint, le typecheck, le build et les tests du dépôt.

La modification porte sur la composition de la page et réutilise les primitives et variantes existantes. Le risque principal est le manque de largeur à côté de la photo sur mobile.

Branche dédiée `codex/contact-profile-buttons`. Plan validé et appliqué.
