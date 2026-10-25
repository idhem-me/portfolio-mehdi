# Lava — roadmap V2

Statut : **planification uniquement**. Aucun développement, service externe, abonnement, publication ou déploiement n’est lancé. Le jeu actuel reste inchangé sur `feature/tetris`, derrière `NEXT_PUBLIC_ENABLE_TETRIS`, avec activation locale uniquement et noindex conservé.

## Cap produit

Enrichir la sensation de jeu, puis donner une raison de revenir. Le mobile, Safari iPhone, la matière liquide et une interface calme restent prioritaires. Chaque lot doit pouvoir être livré et désactivé séparément ; le multijoueur ne conditionne pas les autres lots.

| Ordre | Lot | Valeur recherchée | Taille relative | Dépendance |
|---|---|---|---|---|
| 0 | Consolider la base sur appareils physiques | Une expérience fiable avant d’ajouter des systèmes | S à M | Aucune |
| 1 | Son liquide, discret et optionnel | Renforcer les gestes et les moments de réussite | S | Lot 0 |
| 2 | Défi quotidien déterministe | Donner une raison simple de revenir | M | Lot 0 + simulation reproductible |
| 3 | Leaderboard du défi | Comparer des parties réellement comparables | L | Lot 2 + validation serveur |
| 4 | Duel privé à deux | Jouer ensemble sans complexifier le solo | XL | Simulation reproductible + infrastructure temps réel |

Les tailles expriment la complexité relative, pas un calendrier ni un engagement de livraison. **Première tranche recommandée : lots 0 et 1.** Ensuite, valider le défi quotidien local avant de financer ou construire un backend.

## Lot 0 — base de qualité

### Périmètre

- Tester sur un iPhone physique et un Android milieu de gamme : lancement, premier tap, maintien des boutons, gestes, rotation, perte de focus et reprise.
- Mesurer les temps de frame sur plateau dense, avec effacement Tetris, en clair et sombre. Ajuster la qualité adaptative et vérifier que le fallback SVG reste agréable.
- Vérifier le retour au portfolio et l’isolation des styles/listeners après plusieurs parties et ouvertures de panneaux.
- Garder une capture et un relevé de performance de référence par appareil. Distinguer WebKit sur Mac et Safari sur téléphone.

### Sortie attendue

Aucune régression bloquante sur les appareils cibles. Cible de rendu : 60 fps ; si un appareil n’y arrive pas, réduire automatiquement les effets et documenter le résultat observé. Les contrôles et la lecture de la grille priment sur les effets.

## Lot 1 — son liquide

### Expérience minimale

Le jeu reste silencieux par défaut. Dans Réglages : une option Son et un volume. Le joueur peut activer le son au menu ; son choix est mémorisé.

Palette courte : déplacement très discret, rotation, pose souple, chute rapide, effacement progressif de 1 à 3 lignes, Tetris, montée de niveau et fin de partie. Un petit nombre de variations évite la répétition mécanique. Pas de musique dans cette première tranche.

### Réalisation prévue

- Ajouter un adaptateur audio isolé abonné au bus d’événements existant, sans dépendance audio dans `engine/`.
- Centraliser volumes, priorités, variations et temporisations dans un fichier de configuration.
- Démarrer les capacités audio après une interaction du joueur. Si l’audio est refusé ou indisponible, le jeu continue normalement.
- Limiter le nombre de sons simultanés et éviter les doublons : l’événement d’effacement pilote le son de ligne, Tetris/combo ne relancent pas un second son identique.
- Suspendre les sons à la pause, hors focus et au démontage. Son, haptiques et effets visuels restent réglables indépendamment.
- Créer des sons originaux ou conserver la licence et l’attribution des fichiers retenus.

### Critères d’acceptation

1. Aucun son avant activation explicite, aucun blocage du premier tap sur Safari.
2. Mute/volume persistants ; pas de son résiduel après avoir quitté le jeu.
3. Retour sonore perceptible mais discret ; pas de saturation lors d’un maintien gauche/droite ou d’un combo.
4. Tests sur haut-parleur iPhone et casque ; pas de baisse sensible de fluidité par rapport au lot 0.

## Fondation commune avant les lots 2 à 4

Le moteur accepte déjà une fonction RNG, mais la boucle actuelle avance avec le temps des frames. Cela ne suffit pas encore à garantir une relecture identique sur deux appareils.

Prévoir une simulation à pas fixe, un RNG seedé, une version des règles et un format de replay : seed, mode, version, actions horodatées en ticks, résultat et motif de fin. La relecture doit produire exactement le même plateau et le même score dans les tests.

L’ouverture de première partie reste réservée au mode solo libre. Elle est désactivée dans le défi et le duel : tous les participants doivent recevoir les mêmes conditions de départ. Les records sont séparés par mode et version ; les anciens records locaux ne deviennent pas automatiquement des scores compétitifs.

## Lot 2 — défi quotidien, d’abord local

### Expérience minimale

Une entrée « Défi du jour » propose **deux minutes pour obtenir le meilleur score**. Tous les joueurs reçoivent la même séquence de pièces pour le même jour et la même version des règles. La session se termine au bout des deux minutes de simulation ou à la fin de partie.

L’écran de fin affiche le score, les lignes, le nombre de Tetris et la progression par rapport au meilleur essai local du jour. Plusieurs essais sont permis ; seul le meilleur est retenu. Le mode libre actuel reste accessible et inchangé.

### Règles à fixer

- Le jour est défini en UTC et son heure de renouvellement est présentée dans le fuseau du joueur.
- La date et la seed sont figées au début de la partie : un passage à minuit ne change pas la séquence en cours.
- En version locale, la pause conserve la partie ; le temps de pause n’est pas du temps de jeu.
- Aucun script d’onboarding dans ce mode. Même score de base, mêmes vitesses et mêmes possibilités de contrôle pour tous.
- Sans réseau, le défi local reste jouable. Il n’est pas présenté comme un résultat vérifié ni soumis automatiquement plus tard.

### Critères d’acceptation

1. Même seed + mêmes actions = même résultat sur Chromium et WebKit.
2. Tests des limites de journée et de la durée de partie ; affichage de fin clair sur mobile.
3. Record quotidien distinct du record libre ; reprise et persistance sans corruption.
4. Le défi fonctionne entièrement sans compte et sans backend.

## Lot 3 — leaderboard du défi

### Expérience minimale

Activer le bouton Classement pour le **défi quotidien uniquement**. Une liste courte présente les meilleurs scores et la position de l’essai accepté du joueur. La soumission est volontaire : choix d’un pseudo, aperçu du résultat, puis envoi. Aucun compte obligatoire dans le premier périmètre ; aucun email nécessaire.

Classement : score décroissant, puis nombre de lignes, puis nombre de pièces utilisées croissant pour départager. Si ces valeurs sont identiques, les joueurs partagent le rang. Les règles de départage sont visibles et versionnées.

### Dépendances techniques

- Définir le stockage, l’hébergement et leur coût après validation du défi local. Aucun fournisseur n’est choisi ou provisionné dans ce plan.
- Ne pas faire confiance au score envoyé par le navigateur. Le serveur émet une session et vérifie le replay avec le moteur et la version des règles correspondante.
- Ajouter des limites d’envoi, une validation des pseudos et une procédure de retrait des résultats abusifs.
- Conserver le minimum utile : pseudo, résultat vérifié, version/jour et identifiant de session. Définir la durée de conservation et la suppression avant toute mise en ligne ; pas de tracking ajouté par défaut.
- En cas de panne, garder le score local et afficher clairement que l’envoi n’a pas abouti.

### Conditions de compétition

Les essais avec pause, retour depuis l’arrière-plan ou fonctionnement hors ligne restent consultables localement, mais ne sont pas envoyés dans la catégorie vérifiée. Cette règle doit être annoncée **avant** de lancer un essai classé. Aucun ancien essai local n’est converti rétroactivement en résultat classé.

### Critères d’acceptation

1. Un score fabriqué, un replay modifié ou une version incompatible est refusé.
2. Une soumission répétée n’ajoute pas de doublon ; les égalités ont un comportement stable.
3. L’échec réseau n’interrompt pas le jeu ; aucune donnée n’est envoyée sans l’action prévue.
4. Navigation, clavier, lecteur d’écran et états vide/chargement/erreur vérifiés sur mobile.

## Lot 4 — duel privé à deux

### Expérience minimale

Un joueur crée un salon privé, partage un lien ou un code, puis les deux joueurs se déclarent prêts. Un compte à rebours synchronisé lance le duel. Chacun voit son plateau et un aperçu discret de celui de l’autre ; les contrôles mobiles restent identiques.

Premier périmètre : **duel de score sur deux minutes**, même seed et mêmes règles, sans lignes envoyées à l’adversaire. Cela permet de valider la connexion et le plaisir de jouer ensemble avant de concevoir un mode versus avec attaques. Pas de matchmaking public, de chat ni de mode spectateur.

### Réalisation prévue

- Simulation déterministe et serveur faisant autorité sur le départ, le temps et le résultat.
- Service temps réel et protocole de synchronisation à comparer lors d’un prototype local, sans les figer maintenant.
- Afficher l’état de connexion et limiter les mises à jour de l’aperçu adverse pour préserver le rendu du plateau principal.
- Prévoir annulation avant départ, départage, abandon, délai de reconnexion et expiration du salon.
- Pendant une déconnexion, le chrono compétitif ne se met pas en pause. Si la reconnexion échoue dans le délai annoncé, terminer proprement par abandon, sans attribuer un résultat ambigu.

### Critères d’acceptation

1. Deux appareils réels terminent une partie avec un résultat cohérent, même sous latence simulée.
2. Aucun faux départ, résultat contradictoire ou salon réutilisé après expiration.
3. La reconnexion et l’abandon sont compréhensibles sans explication technique dans l’interface.
4. Le solo reste utilisable quand le service multijoueur est indisponible ; aucun impact sur le reste du portfolio.

## Activation et livraison futures

Prévoir un flag indépendant par lot, désactivé par défaut, sous le flag principal. Les parcours, liens et requêtes du lot restent absents lorsqu’il est désactivé. Le jeu continue à utiliser les composants et tokens du portfolio ; les options ne deviennent pas une nouvelle interface concurrente.

Pour chaque lot : prototype local, tests utiles, revue visuelle mobile/desktop clair/sombre, vérification reduced motion, tests des deux flags et mesure sur appareils cibles. Commits locaux atomiques sur `feature/tetris`. Aucun push, déploiement, changement de main ni retrait du noindex ne découle de cette roadmap.

## Hors du premier périmètre V2

Musique, T-spins et nouvelle grille de scoring, mode versus avec attaques, matchmaking public, comptes sociaux, chat, monétisation et personnalisation des pièces. Ces sujets restent des pistes ; aucun n’est nécessaire pour livrer les quatre lots ci-dessus. Une évolution de scoring devra créer une nouvelle version compétitive.

## Prochaine action prévue

Quand le développement V2 sera explicitement demandé : commencer par le relevé sur appareils physiques (lot 0), puis concevoir et intégrer la palette sonore (lot 1). Le défi, le leaderboard et le multijoueur restent ensuite des lots séparés, sans travail anticipé dans la première tranche.
