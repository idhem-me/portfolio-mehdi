# Audit Tetris — architecture, persistance et frontières de confiance

Date : 13 novembre 2026. Rôle : architecte, revue back-end/sécurité ciblée. Statut : proposition avant validation de phase 4 ; aucun code produit modifié.

## Méthode et limites

Lecture du code courant, des tests, des règles du dépôt et des guides Next installés `01-app/01-getting-started/05-server-and-client-components.md` et `15-route-handlers.md`. Aucun fichier `.env*` consulté. Pas de contrôle de la base déployée, de test réseau réel, d'audit exhaustif de sécurité ou de mesure de performance. Les scénarios ci-dessous sont déduits du code et doivent être reproduits en navigateur. Les anciennes captures ne prouvent pas le comportement courant. Les résultats de commandes de validation sont centralisés par l'orchestrateur.

## Cartographie et acquis à conserver

- Page serveur localisée : `src/app/[locale]/(game)/jeux/tetris/page.tsx` ; métadonnées et porte d'activation serveur ; `tetrisPublic = false` dans `src/features/tetris/flags.ts:3`. Ne modifier ni URLs, ni exposition, ni indexation.
- Orchestrateur client : `ui/tetris.tsx` (904 lignes) concentre écran, préparation réseau, RAF, commandes, audio, pause, HUD et fenêtres secondaires.
- Moteur déterministe indépendant : `engine/game.ts`, `pieces.ts`, `opening.ts`, vérification serveur dans `engine/replay.ts:14-36`. Conserver cette séparation.
- Rendu WebGL et repli SVG : `render/lava.ts`, `board.tsx` ; aperçu pièces séparé. Le moteur n'a pas à connaître le thème.
- Identité, historique et envoi : `profile/client-store.ts`, brouillon de retour auth `auth/draft.ts`, interface `ui/game-over.tsx`.
- Sessions serveur à seed, vérification des actions, destinataire et reçus : `server/supabase-store.ts:67-127` ; ne pas remplacer la validation serveur par le résumé client.

## Constats prioritaires

### A1 — Le brouillon peut ressusciter une fin de partie déjà quittée (priorité haute)

`game-over.tsx:101-103` écrit un brouillon pour toute fin tant que `sent` est faux. La sauvegarde locale réussie (`113-123`) positionne `deviceSaved`, mais ne clôt pas ce brouillon. Son effacement ne se produit qu'après envoi explicite réussi (`186-195`). `tetris.tsx:755-760` ferme le résultat sans effacer ce brouillon ; `start():248-252` ne vide que l'état React `recovered`. Au prochain montage, `199-207` réouvre automatiquement le résultat trouvé en sessionStorage, pendant une validité de 24 h (`draft.ts:64-67`).

Conséquence probable : accueil choisi puis rafraîchissement, ou nouvelle partie interrompue puis rafraîchissement, ramène à un ancien game over. Séparer « résultat affiché », « score conservé » et « action auth à reprendre ». Clôturer explicitement la récupération d'écran après retour accueil/rejouer, sans supprimer une publication demandée encore en attente. Ne pas appliquer un simple `clearDraft()` global qui perdrait un score cloud en attente.

### A2 — Préparation asynchrone non annulable par un changement d'écran (priorité haute)

`start():248-284` attend jusqu'à 1,5 s une session et ne vérifie ensuite que le montage du composant. Pendant la préparation depuis le résultat, Rejouer est désactivé, mais Menu reste actif (`game-over.tsx:273-289`). La réponse peut donc imposer `playing` après le retour choisi à l'accueil. Introduire un identifiant de tentative et une annulation explicite à la sortie ; ignorer toute réponse périmée. Une préparation hors ligne doit rester jouable et son statut de publication doit être clair.

### A3 — Les tokens existent mais leur propagation WebGL ne suit pas le DS (priorité haute)

`game.css:4-10,24-30` définit sept couleurs fixes clair/sombre ; elles ne sont pas actuellement des palettes propres aux DS. `lava.ts:127-141` recharge sa palette seulement lorsque `document.documentElement.className` change. Le provider écrit `document.documentElement.dataset.designSystem` (`provider.tsx:52`) ; les scopes forcés utilisent aussi `data-design-system` (`128`). Ajouter uniquement des variables par thème laisserait donc un canvas périmé lors du changement de DS, et potentiellement lors du chargement différé de sa feuille.

Prévoir un adaptateur de palette résolue depuis la portée réelle du canvas, initialisé sans sentinelle ambiguë, et invalidé à la disponibilité de la feuille et à chaque changement DS/clair/sombre/portée. Éviter de recalculer `getComputedStyle` et `getImageData` à chaque frame. Un même contrat doit alimenter WebGL, SVG, réserve et prochaines pièces. Les paramètres d'effet de `material.ts` restent actuellement constants : décider explicitement lesquels deviennent sémantiques par DS.

### A4 — État de résultat et état d'enregistrement trop entremêlés (priorité moyenne)

`GameOver` contient sauvegarde locale, publication, brouillon auth, changement de destinataire, reprise et présentation. `summary` est reconstruit au rendu (`tetris.tsx:731-739`), et le RAF contient déjà une exception destinée à éviter les effets de resoumission (`383-385`). Capturer un résultat immuable au moment de `gameOver` ; piloter les effets par `runId` et intention utilisateur plutôt que l'identité d'objets de présentation.

Le succès de publication définit `message`, mais `message && !sent` le masque (`game-over.tsx:190-196,258`) : l'utilisateur voit surtout le bouton désactivé. Un état de publication explicite doit rendre visibles succès, envoi, attente réseau, identité à rétablir et inéligibilité. Pour Google/Apple, la sauvegarde locale automatique est exclue (`104-110`) ; si l'on promet « score conservé sur cet appareil », le rendre vrai pour tous les profils, sans publier automatiquement.

### A5 — Couverture navigateur en partie héritée d'un ancien contrat (priorité moyenne)

`tests/profile.spec.ts:178-195` attend les boutons Se connecter/Valider et le champ Pseudo du résultat ; `tests/identity-profile.spec.ts:24-30,69-74` attend un pseudo et un envoi automatique selon le profil. Ces attentes ne correspondent pas au JSX courant de `game-over.tsx:272-296`, où publication en ligne est explicite. Réconcilier les tests avec le comportement validé, sans simplement supprimer les assertions. Le test de repli SVG existant vérifie le nom d'une variable, pas le changement effectif de palette (`tests/tetris/tetris.spec.ts:43-88`).

### A6 — Replays à préserver lors de tout twist (risque de migration)

`verifyReplay` rejoue les actions avec le moteur courant et exige une fin de partie ; aucune version de règles n'est présente dans `RankedRun` (`draft.ts:2-8`). Un changement de scoring, gravité ou séquence pourrait invalider un brouillon et fausser les comparaisons. Première livraison : règles classiques inchangées. Un twist ultérieur doit être un mode séparé non classé, ou faire l'objet d'une version de replay et d'une migration SQL explicitement validées.

## Architecture cible minimale

Pas de nouvelle bibliothèque de machine à états. Un reducer typé peut suffire : `lobby`, `preparing(attemptId)`, `playing(runId)`, `paused(runId, reason)`, `results(result)` ; un seul panneau secondaire à la fois. Garder les objets moteur/renderer hors état React, avec abonnements et nettoyage déterministes. Aucun transfert du moteur vers le serveur dans la boucle de jeu.

Extraire seulement les responsabilités nécessaires : contrôleur de session et transitions ; résultat immuable ; gestion de persistance/publication idempotente par partie ; adaptateur de palette DS. Éviter une infrastructure multijeux abstraite sans second usage réel. Maintenir les handlers POST serveur, les cookies et les contrôles d'origine existants. Aucun nouveau service, aucune dépendance payante, aucune évolution SQL nécessaire pour la première livraison.

## Contrôles de sécurité et coût à conserver

Les endpoints sessions et scores vérifient activation et origine (`app/api/tetris/sessions/route.ts:6-11`, `local-scores/route.ts:7-12`). Cookie de session httpOnly, sameSite lax, secure en HTTPS (`sessions/route.ts:15-20`). Limites de replay et validation des actions serveur (`engine/replay.ts:14-35`). Destinataire courant vérifié avant envoi (`client-store.ts:427-428`) et dans les routes adaptées. Le backend Supabase valide session/expiration/replay/temps réel (`supabase-store.ts:100-112`) et utilise ses RPC existantes. Conserver ces frontières ; ne pas modifier directement la base.

La création de session par partie entraîne un appel réseau même pour une expérience solo ; ne pas multiplier les sessions à chaque rendu ou reprise. Les reconnexions et replays rapides nécessitent l'idempotence existante et des tests de tentatives périmées. L'audit ne certifie pas les RLS ni les quotas de l'environnement déployé.

## Critères de recette

1. Fin → accueil → rafraîchir reste à l'accueil ; fin → rejouer → rafraîchir ne restaure pas le précédent résultat. Une publication demandée et en attente reste récupérable sans imposer l'écran résultat.
2. Session retardée + retour accueil ne lance jamais la partie à réception ; double clic et retour tardif ne créent pas deux sessions actives.
3. Un seul enregistrement local par runId ; publication seulement après intention explicite ; retry et changement de compte ne réattribuent jamais une partie au mauvais compte.
4. Succès cloud, panne réseau, expiration auth, partie guidée, solo hors ligne et limite de replay disposent de statuts exacts et permettent toujours Rejouer/Accueil.
5. Changement de chacun des DS, clair/sombre et thème restauré : palette effective identique WebGL/SVG/aperçus, y compris après feuille chargée tardivement et avec scope local.
6. Navigation clavier et tactile entre pause, réglages, résultat et accueil : focus déterministe et aucun input de jeu sous panneau modal.
7. Suites moteur/replay/identité et tests négatifs serveur existants conservés ; E2E réalignés sur le contrat validé, anciennes URLs et masquage préservés dans les sept langues.

## Découpage conseillé

1. Correctifs de transitions et séparation brouillon/publication, avec tests de régression ciblés.
2. Contrat de tokens et adaptateur renderer, démonstration neutre DS et tests de palettes.
3. Composition des écrans lobby/pause/résultat et traduction des nouvelles surfaces en sept langues.
4. Twist optionnel séparé après validation ; ne pas le coupler à la correction du parcours classique.

Suppression proposée : aucune. Déplacement de route : aucun. Cosignature du plan consolidé : effectuée ci-dessous.

## Relecture et cosignature du plan consolidé

Le 13 novembre 2026, lecture de `REFONTE_PLAN_2026-11-13.md` et de l'audit game design. L'architecte cosigne sans réserve le découpage TET-01 à TET-05. La précision vérifiée dans le contrat visuel est correcte : la stabilité concerne le mapping **identifiant de couleur → token du DS**, pas la conservation de la couleur historique de chaque pièce posée. `engine/game.ts:184-196` recolore actuellement les masses connectées qui supportent la nouvelle pièce ; cette fusion est dans le moteur, elle doit rester inchangée dans TET-03. La migration de palette seule ne doit pas devenir un changement de mécanique implicite.

Le plan protège les frontières de confiance, les replays classiques, l'intention explicite de publication, les envois en attente et les thèmes locaux ; il ne nécessite ni nouvelle infrastructure ni modification SQL. Les tests navigateur restent à exécuter après autorisation d'implémentation. Cette cosignature technique ne remplace pas la validation explicite du propriétaire requise en phase 4. Le twist reste hors périmètre initial.
