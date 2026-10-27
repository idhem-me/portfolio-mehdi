# Cartes — audit et validation locale

Date : 27 octobre 2026. Base : `main`, `5a67c53`, mise à jour avant modification.

## Problèmes corrigés

- La scène était un bloc de page : conversion vers le Dialog partagé Radix du portfolio. Le portail bloque les interactions et le scroll derrière la scène, gère le focus et permet de suspendre avec la croix ou Échap. Les interactions extérieures ne ferment pas la scène. La reprise conserve le booster.
- Conflit entre les translations de centrage du dialog et le plein écran : neutralisation explicite de `translate` sur cette scène seulement.
- Des gardes de timers pouvaient empêcher la reprise d’une transition après un nettoyage d’effet. Les transitions ont maintenant des timers annulables sans garde persistante qui les bloque.
- Le timer de flip était traité comme un objet, alors que son identifiant navigateur est un nombre. Suppression de ce code et des timers imbriqués.
- Tap, drag et clic pouvaient se concurrencer. Une seule décision au relâchement du pointeur, verrou synchrone pendant l’éjection, aucune file d’interactions, retour élastique des gestes insuffisants et traitement de pointercancel.
- Le moteur vérifie l’index attendu pour rejeter un ancien événement. La progression et la finalisation sont écrites dès le geste accepté, indépendamment de la fin de l’animation. La finalisation de la cinquième carte est atomique dans la sauvegarde ; une ancienne sauvegarde interrompue en récapitulatif est finalisée une seule fois à son chargement.
- Les ouvertures successives ont un état visuel neuf et un identifiant unique ; les doubles clics ne relancent pas le tirage. Les identifiants utilisent randomUUID si disponible. Le catalogue, les probabilités, le format de stockage et la collection locale sont conservés.
- Les cartes enregistrées sont validées contre le catalogue, leur rareté et leur numéro de slot avant reprise.
- Les boutons de progression et « Terminer » ont été retirés. Le récapitulatif rétablit la navigation et propose « Ouvrir ».
- Suppression du second gestionnaire de compte dans le profil. Le composant du header et ses providers sont conservés.
- Front/back, collection, détail, pile et récapitulatif partagent `--cards-ratio` (5/7). La largeur de la pile et de la fiche est également limitée par la hauteur disponible.
- Récapitulatif en trois cartes puis deux centrées, badges compacts et nouveautés distinguées des répétitions du même booster.
- La pile reste montée derrière l’emballage et avance pendant la transition caméra ; la bande part dans le sens de découpe et le corps tombe hors du viewport. Les mouvements réduits évitent les grandes trajectoires.
- Révélation spéciale uniquement après l’apparition de la face active ; paramètres centralisés et nombre de particules limité au budget mobile. Les interactions redeviennent disponibles dès la face visible.
- Conservation de CardsAudio, des préférences existantes, du mixeur GameFeelSettings et du service haptique partagé. Ajout d’une chute courte, limitation des répétitions sonores et arrêt des voix à l’interruption. Aucun nouveau panneau audio ni nouvelle intégration de compte.
- La route Cartes entoure la résolution de locale d’un Suspense, conformément à la documentation Next.js installée, pour corriger l’avertissement de navigation instantanée rencontré en développement.

## Tilt et reflets

Implémentation originale dans `card-face.tsx` et `game.css` : coordonnées normalisées 0–1, rotations bornées à ±6°, gradient radial de brillance et gradients métalliques/prismatiques selon la rareté. Écriture des variables CSS dans requestAnimationFrame, sans état React à chaque mouvement. Capture du pointeur tactile limitée à la carte ; annulation, relâchement et sortie réinitialisent l’effet. Les contrôles de fermeture restent en dehors de cette surface. Les mouvements réduits désactivent le tilt et la brillance mobile.

Références consultées :

- [pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css), licence GPL-3.0 annoncée dans le dépôt ; lecture de son composant Card pour les principes de normalisation et de regroupement par frame.
- [holo-card](https://github.com/codeweb-dev/holo-card), licence MIT annoncée dans le dépôt ; principes de tilt, glare et foil décrits dans le projet. Les accès directs raw à son README et à sa licence n’ont pas abouti.

Aucun code ni asset de ces projets n’a été copié. Les illustrations restent les placeholders du catalogue existant.

## Fichiers principaux

- `src/features/cards/engine/opening.ts` : transitions, garde d’index et finalisation.
- `src/features/cards/persistence/repository.ts` : validation et identifiants.
- `src/features/cards/ui/opening/opening-scene.tsx` : Dialog, interruption/reprise et récapitulatif.
- `src/features/cards/ui/opening/card-stack.tsx` : gestes, verrouillage, sauvegarde avant animation et révélation active.
- `src/features/cards/ui/opening/booster-cut-stage.tsx` : découpe, bande et chute.
- `src/features/cards/ui/card-face.tsx`, `collection-screen.tsx`, `game.css` : ratio, fiche et reflets.
- `src/features/cards/ui/profile-screen.tsx` : statistiques sans doublon de compte.
- `src/features/cards/ui/opening/gesture-config.ts`, `feel/config.ts`, `feel/audio.ts` : réglages et retours.
- `src/features/cards/engine/*.test.ts`, `tests/cards/*.spec.ts` : tests de moteur et navigateur.

## Vérifications et limites

Résultats définitifs :

- `npm run test:cards` : 28 tests passent.
- `npm run test:burger` : suite passée.
- `npm test` : 111 tests Tetris passent.
- `npx playwright test tests/cards --project=chromium --project=webkit-iphone` : 12 scénarios passent (11 Chromium, 1 WebKit ; dont le contrôle de position du CTA exécuté séparément).
- `npm run typecheck` et `npm run build` : passent sur le code final.
- `npx eslint src/features/cards tests/cards 'src/app/[locale]/(game)/jeux/cards/page.tsx'` : passe.
- `git diff --check` : passe.
- `npm run lint` : 5 erreurs et 8 avertissements dans des fichiers non modifiés hors Cartes.

 Les tests navigateur utilisent Chromium et WebKit locaux, pas des téléphones physiques. Les formats contrôlés comprennent 390×844 et 375×667 ainsi qu’une ouverture desktop. Les scénarios couvrent gestes courts, découpe gauche/droite, tap et swipes, doubles clics, reprise, ouvertures successives, ratio, récapitulatif, pointeur tactile annulé, aperçus Légendaire/Gold/Diamant et mouvements réduits.

Le lint global conserve des erreurs antérieures dans Clicker Burger et Tetris ; les fichiers Cartes sont contrôlés séparément. Le build signale un avertissement de fallback de police Google Sans préexistant. La sauvegarde reste locale au navigateur ; sa disponibilité dépend du stockage autorisé et de son quota. Aucune synchronisation entre onglets n’a été ajoutée.

À tester sur téléphone réel : découper dans les deux sens, glisser puis annuler, enchaîner plusieurs boosters, tourner le téléphone, suspendre/recharger, faire suivre la brillance au doigt, et vérifier le volume/mute ainsi que les haptiques lorsqu’ils sont pris en charge. Safari iOS ne fournit pas navigator.vibrate ; le fallback iOS existant reste facultatif et ne garantit pas un retour haptique natif universel.

## Préchargement des cinq cartes

Les cinq composants de carte et leurs faces sont montés dès la découpe et restent stables pendant toute l’ouverture. Les cinq faces sont visibles dans la pile, sans dos avec point d’interrogation, conformément à la demande suivante. Seule la carte active est interactive et exposée aux technologies d’assistance. Lors d’un tap/swipe validé, la carte suivante se révèle sous la carte sortante pendant son éjection, sans attendre un nouveau montage. Le verrou d’interaction reste actif pendant cette transition. Le test navigateur dédié vérifie la présence des cinq faces avant et après le swipe et l’apparition de la suivante pendant l’éjection.

## Emballage fermé et CTA fixe

Les cinq faces sont montées dès « Ouvrir un booster », mais toute la pile reste invisible et inaccessible tant que le papier n’est pas déchiré. Elle devient visible au début de wrapperExit, sans attendre la fin de la chute ou de la transition caméra. Les mélanges de couleurs de l’emballage ont également été rendus opaques.

Le CTA principal utilise une ancre fixe commune en bas du viewport, une largeur maximale de 24rem et la safe area basse. Ouvrir, Découper et Reprendre occupent la même position ; le bouton de découpe est placé hors du conteneur animé pour rester ancré au viewport. Un espace inférieur réserve sa place dans le contenu. Le test de géométrie compare les coordonnées à chaque phase, en dehors de l’effet de survol partagé.

## Réserve horaire et exemplaires Shiny — 27 octobre 2026

- Réserve initiale : 10 boosters. Une ouverture réelle consomme un booster dès la sauvegarde du tirage. Une reprise ne consomme pas une seconde fois.
- Recharge : un booster par heure écoulée, y compris hors connexion, plafonnée à 10. Les fractions d’heure sont conservées tant que la réserve n’est pas pleine ; les heures excédentaires au plafond ne sont pas stockées.
- Un compteur et le délai avant le prochain booster sont visibles sur l’écran d’ouverture et le récapitulatif. À zéro, l’action réelle est désactivée et se réactive à l’échéance. Réinitialiser la collection ne recharge pas la réserve.
- Contournement explicite via « Mode dev : boosters illimités », seulement dans next dev sur localhost/127.0.0.1/::1. Il préserve la réserve et se désactive au rechargement. Le build de production n’affiche pas ce contrôle.
- Shiny : 0,001 % par exemplaire (1 / 100 000), indépendamment de la rareté. Les cinq rolls Shiny suivent le tirage normal du booster pour conserver les probabilités de rareté. Le résultat est sauvegardé dans chaque carte tirée avant toute animation et n’est jamais recalculé au rendu/rechargement.
- La collection conserve qty (total) et shinyQty (sous-ensemble Shiny). Les sauvegardes antérieures sont migrées sans perdre de cartes : zéro Shiny pour les anciens exemplaires. Crédit idempotent, simulations sans crédit ni dépense.
- Shiny : texture diagonale, halo, petites étoiles scintillantes, burst étoilé à la révélation et son exceptionnel via le service existant. Les mouvements réduits gardent une apparence statique.
- Collection : filtre Shiny, nombre d’exemplaires, affichage Shiny par défaut si disponible et choix Classique/Shiny dans le détail lorsque les deux variantes sont possédées. Le profil indique le total Shiny et son taux exact.
- Preview dev « Shiny » : cinq cartes Shiny simulées pour contrôler les effets sans modifier les probabilités réelles ni créditer la collection.

Validation du code final : 34 tests moteur passent ; 18 tests navigateur passent sur le serveur du workspace (17 Chromium, 1 WebKit). Le lint Cartes, TypeScript et le build passent dans `/private/tmp/cards-check-clean-20261027`, avec le même code Cartes et les versions exactes du package-lock. Certaines lectures de dépendances dans le workspace restaient bloquées ; le dossier temporaire utilise une réinstallation propre (`npm ci --ignore-scripts`). Aucune dépendance ni configuration du workspace n’a été remplacée. Le seul avertissement du build est le fallback Google Sans déjà connu.

La réserve et le tirage restent locaux au navigateur, comme le prototype existant ; ils ne sont pas protégés contre une modification manuelle du stockage ou de l’horloge et ne sont pas synchronisés entre appareils/onglets. Une économie autoritaire nécessiterait une validation serveur, qui n’a pas été ajoutée ici.

## Bannière après trois boosters, synchronisation Google et accès LAN

La bannière locale s’affiche à partir de trois boosters finalisés. Elle réutilise GoogleSignIn et peut être masquée avec « Continuer sur cet appareil ». La connexion Google conserve désormais un retour OAuth autorisé vers /jeux/cards dans la locale active.

La synchronisation est implémentée via /api/tetris/cards (périmètre HttpOnly existant). Collection, Shiny, réserve, statistiques et booster en cours sont enregistrés par compte vérifié côté serveur. Les révisions optimistes empêchent les écrasements concurrents ; les conflits et changements de compte demandent un choix, sans addition aveugle des quantités. Une copie locale de secours précède un remplacement. Les ouvertures en cours ne sont pas interrompues par une seconde modale. Une remise à zéro locale suspend le sync sans effacer la sauvegarde du compte. Les sauvegardes en attente restent locales en cas de panne.

Validation : 40 tests Cartes, 111 tests Tetris et 36 scénarios Chromium/WebKit passent. TypeScript, lint du périmètre modifié et build passent dans le workspace. La migration est vérifiée avec PostgreSQL/PGlite : les rôles anonymes et authentifiés n’ont pas d’accès direct à la table. Les scénarios Google des tests navigateur utilisent des sessions et un stockage simulés ; aucun vrai compte Google n’a été connecté pendant cette vérification.

Le serveur a été relancé sur 0.0.0.0:3000. Les requêtes vers localhost:3000/jeux/cards et 192.168.1.12:3000/jeux/cards renvoient 200 depuis le Mac ; aucun test physique sur l’iPhone n’est revendiqué. Les dépendances locales bloquées ont été remplacées par les mêmes versions propres déjà vérifiées. L’ancien dossier reste en secours à côté du projet : portfolio-mehdi-dependencies-before-repair-20261027. Une image de couverture existante devenue illisible a été restaurée à l’identique depuis Git ; aucun changement de son contenu n’apparaît dans le diff.

Activation Supabase encore nécessaire : les variables de développement ne contiennent pas Google/Supabase et Vercel masque SUPABASE_URL et SUPABASE_SECRET_KEY comme sensibles non exportables. La vraie connexion/synchronisation locale ne peut pas être validée sans cette configuration. Suivre docs/cards/GOOGLE_SYNC.md et appliquer supabase/migrations/202610270001_cards_progress.sql au projet existant. Aucun secret n’a été affiché ou ajouté au dépôt ; les fichiers temporaires récupérés de Vercel ont été supprimés.
