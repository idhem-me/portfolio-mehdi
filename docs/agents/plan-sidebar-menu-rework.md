# Plan — menu latéral et icône du design system

## Demande

Dans la navigation latérale du portfolio, placer la commande « Menu » tout en haut avec l’icône `Menu`, puis « Accueil » juste en dessous avec l’avatar. Remplacer par ailleurs l’avatar utilisé comme icône du thème Sobre dans le sélecteur de design system par l’icône `Contrast`.

Complément demandé le 13 novembre 2026 : lorsqu’un panneau de navigation secondaire est présent, réduire automatiquement la sidebar principale. Afficher au-dessus des liens du panneau un bouton retour discret vers l’accueil du portfolio, suivi du nom de la section. Appliquer ce comportement au composant partagé afin qu’il couvre Backoffice, Playground et tout autre sous-menu basé dessus.

Complément demandé le 13 novembre 2026 : corriger l’échec de build causé par les téléchargements `next/font/google` vers `fonts.googleapis.com`, en auto-hébergeant les familles ouvertes utilisées par le portfolio et en supprimant la dépendance à Google Sans propriétaire.

Le serveur de développement rencontrait également une erreur Turbopack lors de la résolution de Next.js dans cette copie du workspace. Le script `dev` utilise désormais Webpack, comme le script de build.

## Proposition

- Réorganiser l’en-tête desktop en deux entrées verticales : commande Menu (ouverture/fermeture) puis lien Accueil avec avatar.
- En état réduit, garder les deux commandes accessibles : icône Menu avec infobulle pour développer le panneau, puis avatar seul pour Accueil. Retirer le chevauchement actuel entre l’avatar et le déclencheur.
- Garder le comportement mobile du panneau, avec son libellé Menu traduit et l’entrée Accueil avec avatar.
- Employer `Contrast` pour le thème Sobre dans le sélecteur de design system.
- Synchroniser le libellé « Menu » dans les sept fichiers `messages/{ar,de,en,es,fr,it,zh}.json` afin de respecter la règle i18n du dépôt.

## Périmètre prévu après validation

- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/mobile-brand-bar.tsx`
- `src/components/layout/section-navigation.tsx`
- `src/features/backoffice/ui/shell.tsx`
- `src/components/design-system/switcher.tsx`
- `messages/{ar,de,en,es,fr,it,zh}.json`
- `src/app/layout.tsx`, `src/app/globals.css` et les thèmes CSS pour les familles locales
- `src/app/fonts/` — fichiers webfont et notices OFL
- `docs/design-system/CHANGELOG.md`

Aucune route, URL publique, donnée, migration ou dépendance ne change. Aucune suppression de fichier n’est prévue. Le Playground ne présente pas une variante distincte de l’en-tête global ; aucune démo de primitive n’est donc à modifier.

## Vérifications prévues

Lint et typecheck réussis. Les sept fichiers de messages passent l’analyse JSON et `git diff --check` ne relève pas d’erreur.

Le build Turbopack échoue car Next.js ne résout pas son package depuis le projet. Le build Webpack démarre, puis échoue faute d’accès réseau à `fonts.googleapis.com` pour les polices Next Font. Aucun test automatisé ni contrôle visuel navigateur n’a été exécuté dans cette passe. Aucun commit ni déploiement n’est demandé dans cette tâche.

## Décision

Périmètre demandé explicitement par le propriétaire le 13 novembre 2026. La demande valide les changements décrits ci-dessus ; l’exécution se limite à ces fichiers et à ces comportements.
