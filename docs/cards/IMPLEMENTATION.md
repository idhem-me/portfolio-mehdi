# Boutique Cartes — suivi

## Préparation et lot 1
- Dépôt mis à jour par fast-forward ; corrections des erreurs ESLint préexistantes.
- Header pleine largeur, suppression de l’aide d’identité dans Cartes, entrée boutique.
- Surfaces de révélation et tokens sémantiques ; découverte persistée et rotation 3D.
- Lint, typecheck et build passent. Des avertissements préexistants restent non bloquants.
- Test manuel : ouvrir une légendaire via le FAB de simulation ; vérifier recto/verso, reduced-motion et absence de répétition.

## Décisions de migration
- Invité Supabase ; deux réserves (gratuits horaires, achats) ; cosmétiques limités à Cartes.
- Supabase est l’autorité : aucune nouvelle progression locale, aucun fallback SQLite.
- Migration des deux sauvegardes historiques ; ne jamais fusionner deux sauvegardes.

## Lot 2 — économie et boutique
- Migration `20261027174543_cards_shop_economy.sql` appliquée : profils, collection canonique, catalogue privé, achats idempotents, ouverture serveur et réserve gratuite séparée des achats.
- Les deux sauvegardes Google existantes ont été importées par leur identifiant historique, sans fusion.
- Boutique `/boutique?tab=credits|boosters|cosmetiques|abonnements`, confirmations et retours accessibles. Solde partagé en mémoire entre boutique et jeu ; aucun UPDATE de crédits depuis le client.
- Contrôles : typecheck et build réussis ; tests moteur et lint consignés dans les journaux locaux. Transactions de vérification SQL exécutées puis annulées : crédits, répétition idempotente, achat, isolation entre deux comptes, refus des UPDATE directs.
- À tester : obtenir des crédits gratuits, acheter un pack, revenir au jeu, ouvrir un booster et vérifier le récapitulatif après rechargement.
- Configuration détectée : les connexions anonymes Supabase sont désactivées. Leur activation est requise pour les invités ; les comptes Google restent utilisables.

## Lot 3 — personnalisation
- Cadres fournis copiés dans `public/cosmetics/frames/` ; aperçu du profil et avatar du header partagent le même composant.
- Upload privé : signatures/MIME vérifiés, limite 2 Mo, recadrage carré, réencodage WebP 512 sur le client puis décodage/réencodage serveur avec limite de pixels. SVG/GIF refusés. Aucun chemin fourni par le client.
- Bucket `avatars` créé privé avec policies limitées à `{auth.uid()}/avatar.webp` et achat préalable pour écrire. Lecture via route authentifiée sans cache ; version après upload.
- Vérification lot 3 : lint (sans erreur), typecheck et build réussis. Test supplémentaire des signatures, faux MIME et dépassement de taille.
- À tester : acheter un cadre et l’avatar, équiper/déséquiper, recadrer une photo, activer/désactiver l’avatar et recharger.

## Lot 4 — thèmes
- Six palettes sémantiques, isolées via `data-cards-theme`. Contexte partagé pour les fenêtres et menus rendus en portail ; aucune couleur de thème appliquée aux autres jeux.
- Le mode clair/sombre reste piloté par le réglage existant. Le thème acheté est vérifié par RPC et enregistré dans le profil. Cookie de présentation lu côté serveur pour conserver la couleur dès le chargement, sans constituer une sauvegarde de jeu.
- `node scripts/cards/contrast.mjs` vérifie texte, texte secondaire, boutons, focus et bordure sur les six combinaisons. Ratios dans `CONTRAST.md`.
- À tester : équiper Bleu/Rouge, basculer clair/sombre, ouvrir réglages/filtres/confirmation et recharger la page. Les autres jeux conservent leur palette.

## Lot 5 — une sauvegarde
- Le jeu utilise uniquement les lignes Supabase et un état d’animation en mémoire. L’ancien endpoint de remplacement complet répond 410 et n’utilise plus le stockage SQLite.
- Ancienne progression locale : validation serveur, import unique réservé au rôle serveur, choix explicite si une sauvegarde existe déjà. Les clés locales et anciennes copies de secours sont effacées seulement après transfert/choix réussi.
- Connexion Google depuis un invité : ticket privé à usage unique, lié à l’invité puis au compte authentifié. Sans sauvegarde Google, adoption automatique. Sinon, deux cartes de choix et une confirmation définitive.
- Choix atomique côté Postgres : cartes, inventaires, crédits, cosmétiques, thème et préférences remplacés ensemble ; aucune addition. Verrouillage des deux joueurs, contrôle des révisions et suppression de la ligne abandonnée. Les anciennes lignes cloud ont été retirées après migration vérifiée.
- À tester : jouer en invité puis connecter un compte Google neuf/existant ; annuler la confirmation, choisir une sauvegarde, recharger. Les achats sont bloqués tant que le choix est en attente.

## Vérifications finales
- Lint : zéro erreur ; 8 avertissements préexistants sans rapport avec ce lot.
- Typecheck et build : réussis.
- 59 tests moteur/identité/validation d’image/catalogue : réussis.
- Test intégré `node --env-file=.env.local scripts/cards/e2e.mjs` : compte invité temporaire, crédit gratuit, répétition de requête, achat, solde insuffisant, ouverture de 10 boosters (50 cartes dans leur ordre), récapitulatif idempotent, reprise, achat/équipement cosmétique, thème et avatar privé 512 WebP sans EXIF. Deux achats concurrents ne peuvent dépenser le même solde. Une seconde session réelle vérifie le refus de lecture/écriture du profil tiers, de lecture de son avatar et d’import privilégié. Le compte temporaire et son fichier sont nettoyés ensuite.
- Vérifications SQL dans une transaction annulée : RLS entre deux comptes, refus d’UPDATE direct, adoption complète d’un invité et suppression du perdant.
- Contrastes : voir `CONTRAST.md`. Texte secondaire minimum 5,07:1 ; accent minimum 5,57:1 ; bordure minimum 3,24:1.

## Installation / exploitation
Migrations déjà appliquées au projet connecté, à exécuter dans cet ordre sur un autre environnement :
1. `20261027174543_cards_shop_economy.sql`
2. `20261027175003_cards_private_avatars.sql`
3. `20261027175733_cards_single_save.sql`
4. `20261027180514_cards_harden_import.sql`
5. `20261027181242_cards_login_adoption.sql`

Aucune nouvelle variable : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`), `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`), toutes côté serveur. Google OAuth conserve sa configuration existante. Connexions anonymes activées par le propriétaire pendant la mise en œuvre.

Bucket `avatars` créé privé par migration, limite 2 Mo, MIME WebP, policies propriétaire et achat préalable. Fichiers fournis déjà installés : `public/cosmetics/frames/flowers.png`, `gold.png`, `shiny.png`. Aucun autre asset attendu.

Les avertissements Supabase sur les tables privées sans policy sont intentionnels : accès refusé aux clients, fonctions contrôlées uniquement. L’avertissement sur les sessions anonymes est attendu pour ce mode invité et reste restreint par `auth.uid()`. Les avis globaux préexistants concernant les autres jeux et les mots de passe n’ont pas été modifiés.

## Révision UX — quantités, navigation et desktop
- Quantité libre : stepper − / valeur / +, saisie directe dans une bottom sheet, raccourcis 1/5/10/Tout. Limite réévaluée sur le total gratuit + acheté ; Postgres contrôle à nouveau le stock sous verrou avant tout débit. Les gratuits restent consommés en premier.
- Migration `20261027182656_cards_flexible_opening.sql` appliquée. Les tirages, reprises et récapitulatifs acceptent tous les multiples de cinq cartes. Animation de pile adaptée au nombre choisi, durée de déchirure maîtrisée pour les grands lots.
- Réserve achetée à gauche et réserve gratuite à droite avec recharge. CTA du récapitulatif « Voir ma collection » en secondary.
- Boutique dans le shell commun : header, réglages, avatar et navigation conservés. Changement d’onglet via l’historique natif intégré à Next, avec URLs et précédent/suivant. Produits compacts en lignes visuel / texte, placeholder pour chaque visuel absent.
- Profil : Probabilités après les exemplaires par rareté ; résumé des personnalisations actives seulement, réglage des achats possédés dans un panneau dédié et lien vers les cosmétiques. Aucun produit verrouillé dans ce panneau.
- Palette des cartes indépendante du thème UI, y compris dans les fenêtres de détail. Grilles et largeur desktop élargies ; seuil mobile confirmé dans `globals.css` : moins de 768 px.
- Vérifications : typecheck, lint sans erreur et build ; tests moteur/validation/catalogue ; transaction SQL annulée vérifiant quantité 12 (60 cartes), refus de 0 et de 16 pour un stock de 15, débit idempotent et récapitulatif. Dans le navigateur : boutique et header commun, profil allégé, quantité 7 et refus de dépassement.

## Sécurité des gros lots
- Nouvelles ouvertures limitées à 10 boosters dans le sélecteur et dans la RPC. Un dépassement est refusé avant tirage et débit.
- Les grands tirages déjà enregistrés restent accessibles par un écran de reprise : découverte des cartes ou récapitulatif, sans monter toute la pile en animation. Récapitulatif affiché par tranches de 50 cartes.
- Migration appliquée : `20261027201222_cards_opening_safety_limit.sql`. Transaction SQL annulée : ouverture de 100 refusée sans modifier les inventaires ; ouverture de 10 conservée.
- Décision finale : réserve de 4 gratuits maximum, rechargée de 1 toutes les 6 heures ; les ouvertures supplémentaires sont payées en gems.

## Économie finale — gems et recharge continue
- Réserve de 4 gratuits maximum, remplie au départ, puis +1 toutes les 6 heures écoulées. La recharge s’arrête au plafond ; aucune recharge horaire ni remise à zéro à minuit.
- Chaque ouverture utilise d’abord les gratuits, puis 100 gems par booster restant. Quantité bornée au budget disponible et à 10 par ouverture. Le coût est affiché avant le CTA et envoyé comme plafond de dépense ; un changement de réserve ne peut pas entraîner un coût supérieur à celui affiché.
- Le header affiche les gems ; l’écran d’ouverture n’affiche qu’une réserve gratuite avec sa jauge et un chrono HH:MM:SS. La boutique ne contient plus l’onglet Boosters. L’ancien achat est refusé côté serveur également.
- Migration `20261027201930_cards_gem_openings.sql` appliquée : conversion des stocks achetés à 100 gems par booster, compensation de l’excédent gratuit au-delà de 4, journal privé de conversion, nouveau plafond et nouveau rythme. Les cartes et ouvertures déjà tirées sont conservées.
- Migration `20261027203151_cards_confirm_opening_cost.sql` appliquée : une ancienne version du client ne peut pas déclencher une dépense en gems sans coût annoncé. Le client actualise l’état après un refus de prix ou de solde.
- Contrôles : 63 tests moteur, économie, identité, validation et catalogue ; lint sans erreur, typecheck et build. Parcours HTTP avec invité temporaire : 4 gratuits, ouverture de 10 pour 600 gems, répétition sans double débit, concurrence, plafond, cosmétiques, avatar et RLS.
- Transactions SQL annulées : limites à 6 h moins/plus 1 seconde, conservation du temps partiel, plafond après plusieurs jours, priorité des gratuits, tarif mixte, refus de solde insuffisant et de coût non annoncé, refus de 100 boosters. Un ancien lot de 100 conserve bien ses 500 cartes et se finalise une seule fois.
