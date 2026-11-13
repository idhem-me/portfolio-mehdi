# Plan — cards du panneau Réglages

## Constat

Le panneau de réglages des jeux est composé dans `src/components/games/game-settings/GameSettingsPanel.tsx`. Ses sections emploient une primitive locale `SettingsCard` dont le style est réécrit dans `game-settings.css` (surface, contour, rayon, padding et gap). La primitive `Card` de `src/components/ui/card.tsx` fournit déjà `data-slot="card"`, les espacements `--card-spacing` et la surface sémantique du DS ; les thèmes Fun et Frutiger Aero ciblent directement ce slot. Les espacements autour des sections et du panneau utilisent actuellement des calculs locaux à partir de `--spacing` et `--settings-modal-padding`.

La démo `#settings-modal` du Playground montre les contrôles du panneau mais ne montre pas les cards réelles. Le relevé de couverture classe `SettingsCard` et `SettingsSection` comme absents.

## Périmètre proposé

- Remplacer le chrome de `SettingsCard` par la primitive `Card` du DS en gardant le contrat de classe nécessaire aux réglages et aux exceptions sans bordure.
- Aligner les espacements internes et entre sections sur les tokens déjà disponibles (`--card-spacing`, `--spacing`, `--settings-modal-padding`) et supprimer les valeurs locales redondantes. Ne créer aucun nouveau token sans besoin partagé démontré.
- Vérifier les surfaces, contours, rayons et espacements pour Sobre, Fun, Frutiger Aero et Liquid Glass, en utilisant les tokens sémantiques et l’adaptation par thème existants.
- Montrer une composition de réglages avec des cards réelles dans la démo `#settings-modal`, puis mettre à jour `docs/design-system/playground-coverage.md` et `docs/design-system/playground-local-components.md` selon le résultat.

## Fichiers envisagés

- `src/components/games/game-settings/primitives/SettingsCard.tsx`
- `src/components/games/game-settings/game-settings.css`
- `src/app/[locale]/(site)/playground/catalog.tsx`
- `docs/design-system/playground-coverage.md`
- `docs/design-system/playground-local-components.md`
- éventuellement `docs/designsystem.md` si les conventions de composition doivent être précisées

## Critères de revue

- Les cards du panneau portent le slot et le rendu de la primitive DS, et changent de surface selon le thème actif.
- Tous les espacements, rayons, couleurs, textes et bordures de la composition viennent de tokens existants ; pas de valeur visuelle arbitraire ajoutée.
- Les variantes sans bordure et désactivée gardent un rendu cohérent.
- La démo du Playground présente la composition et les densités Desktop/Mobile ; le registre de couverture correspond à l’implémentation.

## Vérifications prévues après validation

- Consulter la documentation Next.js locale requise par `AGENTS.md` avant les changements de code.
- Exécuter lint, typecheck, build et les tests DS ciblés documentés dans `AGENTS.md` ; noter les blocages d’environnement.
- Examiner la démo en densités Desktop et Mobile et avec les thèmes pris en charge, y compris le focus clavier.

## État

Validé par le propriétaire et implémenté. La démo `#settings-modal` enveloppe maintenant les contrôles dans `SettingsCard`, qui délègue à `Card` du DS. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:cards` et `npm run build` passent. La vérification visuelle dans un navigateur reste à faire : le lancement local a échoué avec `EPERM` à l’ouverture de `127.0.0.1:3020`.
