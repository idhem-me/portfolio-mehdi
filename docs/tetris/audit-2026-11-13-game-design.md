# Audit Tetris — game design et boucle de jeu

Date : 13 novembre 2026. Phase 2–3, proposition avant validation. Agent : expert jeu / game designer.

## Méthode et limites

Lecture du moteur, contrôles, orchestration, résultat, brouillons, rendu et tests Playwright existants. Aucun changement applicatif, aucune lecture de `.env*`, aucune évolution de visibilité. Les problèmes ci-dessous sont établis par le code ; leur fréquence et ressenti nécessitent une session navigateur. Aucun test exécuté par cet agent pour cet audit documentaire. Les captures historiques ne prouvent pas le rendu actuel.

## Ce qui fonctionne et mérite d'être conservé

- Moteur séparé du rendu, source de pièces déterministe, réserve une fois par pièce, trois suivantes, ghost, rotations avec kicks, verrouillage de 500 ms et 15 réinitialisations : base suffisante pour une refonte UX sans réécrire le jeu (`engine/game.ts:43–55,98–102,134–150,175–178,235–238`).
- Score lisible : lignes, combo et bonus de Tetris consécutifs ; niveau toutes les dix lignes (`engine/game.ts:62–76,199–215`). Préserver ces règles et le replay pour les scores existants.
- Pause sur perte de focus/visibilité, réduction des animations système, tactile avec maintien, fallback SVG : préserver ces acquis (`ui/tetris.tsx:176–190,345–361,411–423`, `render/board.tsx:20–51`).
- Les retours audio, haptiques et caméra des lignes sont centralisés pour éviter les doublons (`ui/tetris.tsx:301–330`).

Tous les chemins courts ci-dessous sont relatifs à `src/features/tetris/`.

## Constats prioritaires

| Priorité | Constat et preuve | Conséquence | Proposition / critère |
| --- | --- | --- | --- |
| P1 | Tout brouillon récupéré force `over` dès le montage (`ui/tetris.tsx:199–207`). La sauvegarde locale réussie ne supprime pas le brouillon (`ui/game-over.tsx:101–123`), contrairement à l'envoi explicite (`188–195`). Menu et Rejouer ne l'acquittent pas (`ui/tetris.tsx:248–250,756–760`). | Retour sur le jeu potentiellement accueilli par un ancien Game over, même après sauvegarde locale. Impression de boucle cassée. | Séparer dernier résultat, sauvegarde en attente et intention de navigation. Après Menu puis rechargement, afficher le lobby ; proposer un encart non bloquant si un envoi attend réellement une action. Conserver les données nécessaires au retour OAuth. |
| P1 | La toolbar Réglages/Pause est rendue pour tout état différent de ready, donc aussi over ; ses handlers forcent paused (`ui/tetris.tsx:567–589`). Résultat et pause sont des div/card sans modalité ni confinement de focus (`ui/game-over.tsx:224–235`, `ui/tetris.tsx:763–797`). | Au clavier, un contrôle derrière le résultat peut transformer une partie terminée en pause puis en reprise d'un moteur `over`. C'est un chemin permis par le code, à reproduire en navigateur. | En résultat, retirer/inertiser tous les contrôles gameplay ; interdire `over → paused/playing`. Utiliser un véritable écran résultat, ou une primitive modale avec focus géré. Tester Tab, Échap, P, Espace et retour de focus. |
| P1 | Un slot de brouillon unique (`auth/draft.ts:23,37–39`) est écrit à chaque résultat ; un nouveau résultat remplace l'ancien. | Rejouer peut faire perdre l'accès à un score en attente d'envoi, malgré le message disant qu'il est conservé. | Décision explicite : petite file bornée persistante de scores en attente, ou modèle clairement documenté du dernier score. Recommandation : préserver chaque score non envoyé dans une file bornée, sans empêcher Rejouer. |
| P2 | Résultat riche transmis avec lignes/niveau/pièces/durée, mais seul score et record sont affichés (`ui/tetris.tsx:731–739`, `ui/game-over.tsx:238–270`). | Aucun bilan de progression ou raison de retenter ; la fin devient un panneau de compte. | Montrer score, nouveau record réel, lignes, niveau et durée ; Rejouer primaire, Retour à l'accueil secondaire. Un seul bloc compact de statut sauvegarde, classement facultatif. |
| P2 | Cinq actions au résultat pour un compte connecté : Rejouer, Classement, Menu, Quitter le jeu, Enregistrer en ligne (`ui/game-over.tsx:272–296`). `message && !sent` masque le message de succès après envoi. | Choix concurrents et distinction Menu/Quitter floue ; confirmation d'envoi peu claire. | Deux actions de navigation principales ; classement et envoi secondaires. Statuts explicites « enregistré sur cet appareil », « envoyé », « en attente », « réessayer ». Conserver la publication en ligne explicite. |
| P2 | Première séquence guidée automatique et consommée au premier démarrage, même abandonné (`controls/onboarding.ts:4–10`, `engine/opening.ts`). L'exclusion du classement n'est pas expliquée au démarrage (`ui/tetris.tsx:255–271`). | Le premier essai suit une règle cachée sans vrai apprentissage. | Choix explicite « Découvrir les commandes » au lobby, rejouable ; partie classique accessible immédiatement. Tutoriel local non classé, étiquette visible avant démarrage. Préserver les données de replay anciennes. |
| P2 | Reprise immédiate après pause (`ui/tetris.tsx:773–779`) ; fermeture Réglages garde la pause (`799–801`). | Deux gestes pour revenir depuis Réglages et reprise sans temps de réorientation. | Règle uniforme : fermer Réglages revient à l'état d'origine (pause si ouverts depuis partie), puis Reprendre explicite. Petit décompte de reprise optionnel/interrompable ; pas de chute avant fin du décompte. |
| P2 | Geste rapide vers le haut = hard drop irréversible (`ui/tetris.tsx:643–653`) ; mouvement horizontal avance d'une cellule par événement dépassant 22 px (`627–640`). | Apprentissage nécessaire ; sensibilité dépendante des événements pointer. | Conserver les boutons tactiles comme référence, indiquer « glisser vers le haut : lâcher ». Évaluer en manipulation réelle ; tester grands déplacements et gestes diagonaux avant de changer les seuils. |
| P2 | Recoloration de toute masse connectée supportant une pièce au verrouillage (`engine/game.ts:182–196`). | Identité couleur des anciennes pièces disparaît : c'est déjà un twist esthétique, et un déterminant de lisibilité. | Ne pas confondre migration vers tokens et changement de cette mécanique. Garder d'abord le comportement, tester les silhouettes ; option « Fusion » seulement dans un lot validé, sans modifier collision/score. |
| P3 | Gravité multipliée par 0,7 à chaque niveau, minimum 35 ms (`engine/game.ts:74–76`). | Accélération forte : niveau 5 ≈ 240 ms, niveau 10 ≈ 40 ms. Aucun problème démontré sans essais joueurs. | Conserver le classique classé ; mesurer le ressenti avant rééquilibrage. Un éventuel mode détente doit être séparé des records classiques. |

## Flow cible recommandé

1. **Accueil** : Jouer (classique), record local, commandes accessibles, compte/réglages secondaires. Une sauvegarde en attente reste un encart, jamais un écran imposé.
2. **Préparation** : bouton occupé et lancement unique ; session distante facultative avec repli local déjà existant ; annoncer le caractère local si nécessaire sans bloquer.
3. **En partie** : plateau, réserve/suivantes, score/lignes/niveau ; une entrée Pause. Aucun écran annexe ne laisse tourner le jeu.
4. **Pause** : Reprendre primaire, Réglages et Retour à l'accueil secondaires. Confirmer l'abandon seulement si une partie est effectivement en cours et non récupérable.
5. **Résultat** : plateau figé visible, titre « Partie terminée », score et bilan ; Rejouer primaire, Retour à l'accueil secondaire. La sauvegarde est indépendante de la navigation et n'empêche jamais de rejouer.
6. **Classement / réglages** : garder l'origine explicite ; fermer revient au résultat si ouverts du résultat, à la pause si ouverts d'une partie. Aucun retour vers playing depuis un résultat.

État gameplay proposé : `ready → preparing → playing ↔ paused → result`, avec `result → preparing/ready`. Le décompte de reprise et les panneaux secondaires sont des sous-états explicites si retenus. L'état de sauvegarde (`local/pending/sending/sent/error`) n'est pas un état gameplay.

## Cinq challenges / twists et réponse du game designer

| Idée | Effort | Apport | Coût / risque | Réponse et classement |
| --- | --- | --- | --- | --- |
| **Objectif personnel de session** : prochaine partie, atteindre le prochain palier de lignes ou dépasser son record. | S | Donne une raison concrète de rejouer à partir du résultat. | Local uniquement, aucun service ; objectif sans bonus ni changement moteur. Texte à traduire, éviter injonction après échec. | **Recommandé après le socle** : même score et même règles ; afficher un objectif facultatif, déterministe, non punitif. |
| **Fusion comme signature visuelle du thème** : coloration du contact déjà présente, traitement Sobre/Fun/Aero à intensité maîtrisée. | M | Personnalité du portfolio sans nouvelle règle. | Tokens de matière et vérification GPU/fallback ; contraste et lisibilité priment. | **Retenir comme piste visuelle**, uniquement après palettes sémantiques. Aucun multiplicateur de score et aucune recoloration hors DS. |
| **Sprint 40 lignes local** avec temps final. | M | Partie bornée et victoire explicite ; alternative à la seule mort par empilement. | Nouvelle condition de fin, libellés, records séparés ; pas de nouveau service. | **Reporter en lot optionnel** : mode distinct et non envoyé au classement classique. |
| **Atelier détente** : gravité faible ou contrôlée, essai des rotations/réserve. | M | Onboarding réel, accessible, rejouable. | Mode séparé, aucun score classé, tests moteur/input supplémentaires. | **Préférer tutoriel court d'abord** ; détente complète seulement si besoin confirmé. |
| **Puzzle quotidien déterministe** : même empilement et séquence pour tous, résoudre en quelques pièces. | L | Découverte tactique, usage des seeds. | Génération/validation des puzzles, fuseau de date, score distinct, aucune anti-triche supposée ; peut rester local/gratuit. | **Ne pas inclure dans la refonte initiale** : coût et nouveau produit trop importants avant stabilisation du classique. |

## Critères de validation du lot de refonte

- Rejouer depuis un résultat crée exactement une partie ; aucun ancien input maintenu ne se propage.
- Game over → Tab/P/Échap/Réglages ne peut pas reprendre le moteur terminé.
- Retour accueil puis rechargement ne rouvre pas automatiquement un résultat acquitté ; retour OAuth conserve bien le score et l'identité d'origine.
- Échec réseau et stockage indisponible ne bloquent ni résultat ni nouvelle partie ; statut visible exact.
- Résultat et navigation identiques en clavier/souris/tactile ; focus visible, arrière-plan inactif quand modal, cibles 44 × 44 px.
- Tester thèmes Sobre/Fun/Aero et mode développement Glass, clair/sombre, SVG/WebGL, reduced motion, 320 px et paysage, arabe RTL/chinois.
- Comparer score/replay du classique avant/après avec seeds et actions identiques ; les twists de règles restent hors classement classique.
- Maintenir visibilité, URLs et noindex existants. Le Playground ne doit présenter que les tokens/compositions génériques autorisés, sans divulguer de jeu masqué.

## Couverture observée

`tests/tetris/tetris.spec.ts` vérifie notamment gates/URLs, fallback, reduced motion, apparition de Rejouer et géométrie. Ces tests seuls ne couvrent pas les transitions résultat → réglages/pause, l'acquittement des brouillons, ni une reprise complète au clavier. Élargir les suites existantes avec ces parcours plutôt que multiplier les captures historiques sans assertions comportementales.
