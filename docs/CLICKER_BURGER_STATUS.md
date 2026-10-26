# Clicker Burger — état et écarts au cahier des charges

## Cette livraison

Jeu intégré dans le dépôt du portfolio, route `/jeux/clicker-burger` avec variantes locales de langue. Visibilité `clickerBurgerEnabled = true` et `clickerBurgerPublic = true`, indépendantes des flags de Tetris. Carte de jeu avec couverture dans la page Jeux ; aucune couverture ni zone burger illustrée dans le panneau Restaurant.

Dix images fournies, intactes, enregistrées dans `public/assets/burger`. L’archive contient également `burger-n3-national.png`, qui double le contenu du warehouse : le fichier choisi pour le niveau 4 est bien `burger-n4-warehouse.png`. La couverture d’origine reste uniquement dans `public/img/clicker-burger/cover.png`.

Bouton Accent, accordéon et panneaux partagent les composants du portfolio. Les styles sont limités au jeu et aux portails des panneaux. Les missions réclamées quittent la liste active et deviennent des titres grisés dans l’accordéon Missions réussies, fermé par défaut. Une popup accessible félicite les changements de niveau pendant la partie. Charger une ancienne sauvegarde ou changer de profil ne provoque pas une fausse popup.

## Progression et équilibrage

| Niveau | Bâtiment        | Ventes cumulées minimum | Prérequis supplémentaires                                              | Multiplicateur |
| ------ | --------------- | ----------------------: | ---------------------------------------------------------------------- | -------------: |
| 1      | Table           |                     0 € | Aucun                                                                  |             ×1 |
| 2      | Stand           |                   250 € | Aucun                                                                  |             ×2 |
| 3      | Restaurant      |                 5 000 € | Recette signature                                                      |             ×4 |
| 4      | Warehouse       |               100 000 € | Franchise et entrepôt                                                  |             ×8 |
| 5      | International   |                    5 M€ | Recherche mondiale et marché national                                  |            ×16 |
| 6      | Mars            |                  500 M€ | Programme spatial, 70 % de domination, 3 mégafactories, marché martien |            ×32 |
| 7      | Système solaire |                 500 Md€ | Marché Europe/Jupiter                                                  |            ×64 |
| 8      | Quantique       |               5 000 Md€ | Recherche supraluminique                                               |           ×128 |
| 9      | Intergalactique |              5 × 10¹⁴ € | Alpha du Centaure                                                      |           ×256 |
| 10     | Univers         |              5 × 10¹⁷ € | Marché multivers                                                       |           ×512 |

Les seuils augmentent par facteurs de 10 à 1 000 ; les achats de chaque générateur conservent leurs coûts géométriques. Les recettes, récoltes et capacités logistiques évoluent ensemble : augmenter la taille du restaurant ne laisse plus la chaîne industrielle bloquée sur une minuscule capacité initiale. Un tampon de 30 secondes de production évite de dépenser indéfiniment dans des stocks invendables. Une réserve de trésorerie et les nouveaux marchés restent déterminants.

Deux simulations déterministes, avec décisions d’investissement toutes les 10 secondes, atteignent le niveau 10 en 16,13 h et 16,12 h environ. Le départ actif clique pendant dix minutes ; l’autre arrête après la première embauche. Le scénario ne fait pas de prestige, réclame les récompenses, réinvestit et conserve une réserve. Il s’agit de stratégies automatisées, pas d’une garantie de durée pour un joueur humain. Une stratégie dépensant tout immédiatement était beaucoup plus lente : la stratégie de réserve et les tests de solvabilité sont explicitement documentés dans le simulateur.

Reproduire : `npm run balance:burger`. Les deux scénarios sont également des tests : tous les niveaux doivent être atteints dans l’ordre, sans budget négatif, entre 12 et 36 h simulées.

## Ce qui fonctionne

- Production manuelle et automatique, vente distincte, prix et demande élastique, ingrédients et stock.
- Achats par lots et Max, montants Decimal, coûts exponentiels, chaînes agriculture/production/distribution simples.
- Découverte progressive, dix recherches à prérequis, seize marchés, cinq acquisitions et dix événements à choix.
- Dix niveaux illustrés, récompenses uniques de missions, prestige confirmé et bonus permanents.
- Sauvegarde locale automatique, export/import validé, anciennes sauvegardes conservées, reprise hors ligne plafonnée à 8 h, protections contre les nombres invalides.
- Profils locaux et passerelle de compte Tetris/Google. Les sauvegardes invitées et par profil restent séparées.
- Interface mobile/ordinateur, Google Sans du portfolio, thèmes clair/sombre, composants shadcn, mouvement réduit et dialogues accessibles.

## Écarts encore présents par rapport au prompt initial

| Sujet                                            | État réel                                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quartier et cartes isométriques interactives     | Retirés à la demande de l’utilisateur. Ce n’est plus une fonctionnalité à rétablir automatiquement. Les anciens terrains restent dans les sauvegardes pour compatibilité.                                                                                                        |
| Cartes régionale, mondiale, solaire et stellaire | Non implémentées : extensions sous forme de marchés, pas de cartes géographiques dédiées.                                                                                                                                                                                        |
| Richesse de la progression terrestre             | Modèle simplifié : pas de pays détaillés, menus locaux, réseaux de livraison visuels, grandes chaînes logistiques ou influence corporative.                                                                                                                                      |
| Concurrence                                      | Trois rachats statiques ; pas de parts de marché adverses dynamiques ou de réactions commerciales.                                                                                                                                                                               |
| Recherche                                        | Dix recherches (dont quatre optionnelles) ; pas encore un arbre à dix catégories distinctes.                                                                                                                                                                                     |
| Prestige                                         | Bonus production/demande ; pas de boutique de capital permanent, coûts réduits, marketing permanent ou parcours de franchise distincts.                                                                                                                                          |
| Événements                                       | Dix événements temporaires (early → spatial) ; pas encore d’arcs narratifs persistants ni de crises multi-étapes.                                                                                                                                                                 |
| Espace et endgame                                | Marchés et générateurs fonctionnels, mais pas de transport spatial, énergie, exploitation d’astéroïdes, clients extraterrestres ou économie galactique spécifique. La progression est plafonnée à 10 000 unités par catégorie et ne constitue pas encore un mode infini élaboré. |
| Conclusion narrative                             | Popup dédiée au niveau Univers ; pas encore de crédits / épilogue long.                                                                                                                                                                                                          |
| Durée initiale de 15–30 h et plus                | Pas reproduite à l’identique : le parcours automatisé actuel dure environ 16 h au total et commence l’espace vers 4,7 h. La conquête terrestre devrait encore être enrichie pour atteindre l’objectif narratif initial sans murs artificiels.                                    |
| Comptes et cloud                                 | Google dépend des paramètres du service Tetris. La progression Clicker Burger n’est pas synchronisée entre appareils ; elle reste dans le navigateur.                                                                                                                            |
| Validation                                       | Tests moteur et simulations, vérification navigateur ; tests E2E et validation sur appareils physiques encore à développer.                                                                                                                                                      |

Les nouveaux souhaits de simplicité, suppression du quartier et absence de spoilers priment sur les sections correspondantes du prompt initial.

## Validation de cette livraison

- 141 tests réussis : 30 pour Clicker Burger et 111 pour les systèmes de Tetris.
- TypeScript et lint réussis sans erreur ; compilation de production Turbopack réussie avec la route publiée dans les sept langues.
- Avertissement non bloquant déjà lié à Google Sans : Next ne génère pas de police de secours métrique, la police principale est bien chargée.
- Vérification de la carte Jeux et de son lien dans une version de production isolée, avec Tetris désactivé : Clicker Burger reste visible et jouable.
- Vérification de la popup réellement déclenchée par une vente, et de l’historique des missions. La sauvegarde de test utilise une autre origine locale et ne remplace pas la partie de l’utilisateur.

La vérification isolée évite les blocages de lecture observés dans le dossier synchronisé. Le commit conserve le code et les images du dépôt original, sans les données, secrets, dépendances ou fichiers de compilation temporaires.

## Révision du 26 octobre 2026 (remplace les indications précédentes)

- Missions : onglets « En cours / Réussies ». Extensions : « Disponibles / Acquises ». Composants Tabs du portfolio, panneaux de hauteur stable. Missions réussies en style normal avec coche, triées par ordre de récupération décroissant. Multiplicateur centré sous le bouton.
- Apparence commune avec le site via next-themes ; aucune préférence indépendante du jeu.
- Niveaux achetés depuis l’image du bâtiment : 5 k€, 100 k€, 1 M€, 500 M€, 10 Md€, 1 000 Md€, puis 100 000 Md€, 10¹⁶ € et 10¹⁸ €. Les prérequis de recherche et de marché restent nécessaires. Anciennes sauvegardes migrées sans retrait rétroactif d’argent.
- Popup de niveau centrée, désactivable dans les réglages ; pastille lorsque l’achat est possible.
- Événements proportionnels à la trésorerie et au revenu, offre figée durant l’événement et emplacement stable après participation ou refus.
- Compte commun extrait dans `src/features/account`, utilisé par Tetris et Clicker Burger : pseudo, photo, Google et session partagés. Le stockage historique Tetris et ses routes API sont conservés pour compatibilité ; leur disponibilité ne dépend plus de l’activation du jeu Tetris. La sauvegarde Burger reste locale, séparée par identité, sans synchronisation cloud entre appareils.
- 150+ tests réussis (compte commun, Burger, Tetris). Le parcours simulé jusqu’au niveau 10 est d’environ 13,7 h avec achats optimisés ; ce n’est pas une durée garantie pour une partie humaine.

## Enrichissement contenu (26 octobre 2026)

Sans boutique de prestige ni cartes géographiques :

- **Événements** : 10 scénarios (early → spatial), coûts/récompenses toujours proportionnels à la trésorerie.
- **Missions** : jalons mid/late (villes FR, concurrent, mégafactory, continents, solaire, multivers).
- **Recherches** : +4 optionnelles (`branding`, `automation`, `menus`, `astrochef`) avec buffs demande / logistique / orbital.
- **Marchés** : Bordeaux, Marseille, Côte d’Azur entre le national et l’Europe.
- **Rivaux** : Crisp King et VoidBite.
- **Fin narrative** : popup dédiée au niveau Univers.
