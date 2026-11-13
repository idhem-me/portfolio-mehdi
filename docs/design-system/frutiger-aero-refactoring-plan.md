# Refactoring Frutiger Aero — 13 novembre 2026

Statut : plan validé explicitement le 13 novembre 2026 (« ok go utilise les agents qu'il faut pour produire »). Refactoring implémenté ; images light/dark déposées par l'utilisateur et raccordées aux modes correspondants. Vérification navigateur bloquée par l'environnement. Voir le changelog pour la recette.

## Périmètre et constat

Projet : `portfolio-mehdi`. Le thème Frutiger Aero et la surface d'accueil à papier quadrillé y sont présents. `mtmd-list` contient une copie du thème mais ne fait pas partie de ce lot.

- `src/components/design-system/frutiger-aero.css` possède les palettes clair/sombre et les effets locaux, avec frontières `@scope` pour les aperçus et portails Radix. Les boutons ont actuellement un voile à trois stops, les cartes une ombre légère et les champs aucun traitement creusé spécifique.
- `src/app/globals.css` compose le papier de l'accueil en six couches : modifier uniquement `--home-paper-backdrop` conserve la grille. Il faut remplacer la composition complète dans la portée Aero.
- `src/app/layout.tsx` charge les polices avec `next/font`. `design-system.css` affecte Google Sans aux thèmes hors Fun ; prévoir une résolution explicite de la police Aero sans modifier les autres thèmes.
- Le Playground possède une composition `ThemeDemo` (carte, champ, actions, dialogue) et un comparatif avec nuanciers.
- Des changements locaux concernant les analytics, outils et tests sont déjà présents : les conserver sans les inclure dans ce refactoring.

## Plan proposé

1. Récupérer le fichier fourni `bg-aero-frutiger.png` (référence connue `libfile_fd032f21899c8191a9b8339598063657`) et l'ajouter sous `public/img/backgrounds/bg-aero-frutiger.png`. Sur `.home-paper-background`, remplacer grille, marge et voile par un token d'image, cadré en `cover`, uniquement dans la portée du thème Aero. Garder l'image visible aussi en sombre avec une adaptation de lisibilité pilotée par tokens si nécessaire.
2. Refaire les tokens de `frutiger-aero.css` : eau/ciel, émeraude, encre bleu nuit, gel à quatre stops (0/49/50/100 %), biseaux, réfraction interne, contours externes, ombres bleutées, lueurs, champs creusés, flare, rayons, typographie et mouvement. Définir les valeurs dans les tokens et les consommer dans les règles des composants.
3. Appliquer ces traitements aux variantes de boutons existantes, cartes, navigation et surfaces superposées ainsi qu'aux champs Input/Textarea/Select. Préserver danger, disabled, invalid, focus clavier et états pressés. Poser le reflet sur les surfaces compatibles sans écraser les pseudo-éléments fonctionnels existants. Prévoir des surfaces lisibles sans backdrop-filter et avec transparence réduite.
4. Charger Open Sans via `next/font/google` dans `src/app/layout.tsx`, avec graisses 400/600/700 et italique. Appliquer sa variable uniquement à Aero ; privilégier les graisses 400/600 et les ombres de texte adaptées au fond. Préserver les polices dédiées arabe/chinois et monospace.
5. Actualiser la composition Aero dans `src/app/[locale]/(site)/playground/catalog.tsx` et ses tokens dans `playground/design-systems/page.tsx` pour montrer fond, gel bleu/vert, verre et champs. Réutiliser les libellés traduits existants ; synchroniser les sept langues seulement si de nouveaux libellés sont nécessaires.
6. Mettre à jour `docs/designsystem.md`, `docs/design-system/inventory.md`, `docs/design-system/CHANGELOG.md` et la couverture Playground si elle change ; compléter AGENTS.md uniquement pour les conventions nouvelles et pérennes.

## Contrôles et critères de fin

- Comparer accueil et Playground en clair/sombre, desktop/mobile, Aero global et aperçu Aero local. Vérifier le retour aux autres thèmes, les portails et l'absence de grille sur le seul accueil Aero.
- Vérifier lisibilité et contraste des actions sur les quatre stops, hover/focus/pressed/disabled/invalid, cibles mobiles de 44 px et préférence de mouvement réduit.
- Exécuter lint, typecheck, build et tests prescrits par le dépôt ; compléter avec les scénarios navigateur pertinents pour thèmes, portées et accueil. Consigner toute limitation d'environnement avec sa cause.
- Aucun changement de route, de données, de visibilité des thèmes, de structure de page ni suppression de fichier.
- Commit et déploiement explicitement demandés après validation visuelle du thème par l'utilisateur. Publier Frutiger Aero en conservant Liquid Glass expérimental ; exclure le travail SEO/analytics préexistant du lot.

## Alternatives évaluées

| Option | Décision |
| --- | --- |
| Modifier les primitives partagées pour le relief | Garder les effets dans la portée CSS Aero pour limiter les régressions. |
| Recréer le fond avec des dégradés CSS | Utiliser exactement l'image fournie. |
| Ajouter un simple voile blanc aux boutons | Utiliser les quatre stops et la cassure demandés. |
| Donner à tous les contrôles la même couleur | Garder les rôles principal, accent, secondaire et danger. |
| Réutiliser le fond clair tel quel sous les textes sombres et clairs | Vérifier les deux modes et adapter les surfaces par tokens pour maintenir la lisibilité. |

## Risques à vérifier

Le flou peut coûter sur mobile : réserver un niveau raisonnable aux surfaces vitrées. Les dégradés très clairs peuvent affaiblir les contrastes : vérifier les stops et ajuster les tokens. Les pseudo-éléments de flare doivent conserver les éléments fonctionnels et ne jamais intercepter les clics. Le chargement de la police peut dépendre de l'accès réseau pendant le build ; conserver une famille de repli et documenter un éventuel blocage.
