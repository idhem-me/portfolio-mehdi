# Plan — espacement de la sidebar

## Demande

Ajouter un espace de `2px` entre les éléments des deux listes desktop annotées :

- les liens de navigation principale (« Accueil » à « Me contacter ») ;
- les réglages du pied de sidebar (« Sobre » à « Cookies »).

## Inventaire et preuves

- Les deux listes sont rendues par `AppSidebar` dans `src/components/layout/app-sidebar.tsx`.
- Le menu principal desktop passe par `SidebarMenu`, dont le `gap-0` par défaut est défini dans `src/components/ui/sidebar.tsx`.
- Le menu du pied de sidebar ne définit pas de gap sur sa propre liste. Le `gap-1` du parent `SidebarFooter` ne sépare pas les éléments de cette liste.
- Les deux menus mobiles définissent déjà `gap-4` et ne sont pas les éléments sélectionnés dans les commentaires.
- Le projet utilise Tailwind CSS 4 ; l’utilitaire `gap-0.5` représente l’espacement demandé de `2px`.

## Plan proposé

1. Dans `src/components/layout/app-sidebar.tsx`, définir `className="gap-0.5"` sur les deux `SidebarMenu` desktop concernés.
2. Ne modifier ni les listes mobiles, ni les primitives UI, les traductions, les routes ou les tokens du design system.
3. Après validation et exécution, contrôler visuellement la sidebar desktop et lancer les vérifications exigées par `AGENTS.md` : lint, typecheck, build et tests. Les modifications déjà présentes dans le worktree resteront intactes.

## Risques et décisions

- Le changement n’affecte que l’espacement vertical des deux listes desktop ; le contenu, les cibles interactives et les URL restent identiques.
- Aucun fichier n’est supprimé et aucune migration, redirection ou traduction n’est nécessaire.
- Fichier de code prévu : `src/components/layout/app-sidebar.tsx` uniquement.

## État

En attente de validation explicite du propriétaire avant toute modification de code.
