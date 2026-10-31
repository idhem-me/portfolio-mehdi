# Listes de cadeaux — intégration

## Installation

Ouvrir le SQL Editor du **projet Supabase existant**, créer une requête et exécuter
une seule fois tout le fichier [sql/gift-lists.sql](sql/gift-lists.sql).
Le script est transactionnel : une erreur annule l'ensemble de cette installation.
Il ajoute uniquement les tables et fonctions `gift_*`.
L'utilisateur a confirmé avoir exécuté ce script dans Supabase après sa livraison.
Les trois tables avec RLS et les permissions des fonctions ont ensuite été
contrôlées sur le projet connecté. Ne pas réexécuter le script.
Le complément [gift-list-occasions.sql](sql/gift-list-occasions.sql) ajoute le
libellé libre des occasions. Il a déjà été appliqué au projet connecté sous le
nom `gift_custom_occasion_label`. Pour une nouvelle base, exécuter le script de
base puis ce complément. Cette adaptation ajoute une seule colonne facultative
et ne modifie ni policies, ni permissions, ni réservations existantes.
Le complément [gift-list-cover.sql](sql/gift-list-cover.sql), appliqué sous
`gift_optional_list_image`, ajoute également une seule colonne facultative.
Sur une nouvelle base, exécuter les deux compléments après le script de base.

C'est un script d'installation à relire et exécuter dans SQL Editor, pas une
migration déjà appliquée. Ne pas l'exécuter une seconde fois. Lors de la mise
en place du suivi des migrations, enregistrer cette installation avec la CLI
Supabase plutôt que de réappliquer les créations de tables.

## Choix retenus

- URL publique : `/l/<slug>`, sans service de raccourcissement externe.
  Le slug fait 20 caractères hexadécimaux aléatoires (80 bits).
  Le lien est partageable et donne accès à la liste à quiconque le possède.
  La page envoie `noindex`, `nofollow`, `Referrer-Policy: no-referrer`
  et ne figure pas dans un sitemap ou une liste publique.
- Prénom et nom dans un seul champ obligatoire `guest_name` ; email et message facultatifs.
- Noms des participants visibles aux invités ; emails et messages exclus de la réponse publique.
- Montants en euros, à deux décimales, **déclarés** : aucune collecte, confirmation
  de virement ou opération de remboursement.
- Cagnotte : prix cible obligatoire et positif ; aucune participation au-delà du
  solde restant. Un échec concurrent devra inviter à actualiser la jauge.
- Cadeau simple : une seule réservation active, garantie par un index unique.
- Annulation par secret de 32 octets aléatoires, dont seule l'empreinte SHA-256
  est stockée. L'annulation libère le cadeau ou la capacité de participation.
  Une réservation annulée reste identifiée pour qu'une ancienne requête ne la recrée pas.
- Prix et type de cadeau ne sont plus modifiables tant qu'il existe une réservation
  active. Les autres champs descriptifs restent modifiables.

## Compte et accès serveur

Le client Supabase et le compte Google existants sont réutilisés. Le cookie
reste limité à `/api/tetris` : les routes créateur et d'extraction sont placées
sous `/api/tetris/gifts`. Aucune migration de session n'est nécessaire.
Les comptes locaux du navigateur ne sont pas des comptes créateurs persistants.

Les tables `gift_lists` et `gift_items` ont des policies propriétaire et des droits
de modification limités. `gift_reservations` n'a aucun accès navigateur, y compris
pour le propriétaire. Cela évite une lecture brute des messages et secrets.
Les fonctions sont `SECURITY INVOKER`, avec `search_path` vide et exécution accordée
uniquement à `service_role`. Aucune fonction n'élève les privilèges du navigateur.

Le serveur utilisera les opérations suivantes :

| Opération                        | Fonction / contrôle                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Lecture invité                   | `gift_read_public(slug)` ; aucune énumération publique des listes                                                         |
| Réservation / participation      | `gift_reserve(slug, item_id, guest_name, guest_email, message, amount, token)`                                            |
| Annulation                       | `gift_cancel(token)` ; confirmation par une requête POST, jamais un GET qui modifie les données                           |
| Détails créateur                 | `gift_read_owner_reservations(list_id, verified_user_id)`                                                                 |
| Création / édition / suppression | Client authentifié soumis à RLS ; pour les opérations avec clé serveur, filtrer explicitement par le propriétaire vérifié |

`verified_user_id` doit provenir de `auth.getUser()` sur le serveur, jamais d'un
paramètre envoyé par le navigateur. La clé secrète contourne RLS : tous ses appels
doivent rester côté serveur et les mutations créateur doivent contrôler la propriété.
Un client serveur sous clé secrète ne doit pas recevoir la session utilisateur.

Les modifications de prix et de type passent par le serveur : ces colonnes ne sont
pas modifiables directement par `authenticated`. Le déclencheur contrôle les
réservations sous le rôle serveur. Le déplacement d'un cadeau entre listes est interdit.

Pour réserver, le navigateur génère un secret de 32 octets avec Web Crypto
(`crypto.getRandomValues`), puis le conserve en session avant tout envoi.
Réutiliser **le même token et les mêmes données** lors d'une nouvelle tentative
après perte de réponse. Ne pas créer une participation supplémentaire à chaque retry.
Prévoir la conservation du secret avant l'envoi ; ne jamais le journaliser ni le
transmettre à l'outil analytique. Le lien d'annulation doit utiliser un fragment
(exemple : `/listes/annuler#<token>`), lu puis envoyé dans le corps d'un POST.
La page d'annulation ne doit charger aucun outil de collecte ou de rejeu de session.
Pas d'envoi d'email automatique prévu dans cette version.

Le verrou du cadeau sérialise les réservations, annulations et changements de prix.
Le serveur ajoute validation, contrôle d'origine, limitation par instance et
messages d'erreur adaptés. Cette limitation mémoire n'est pas distribuée entre
instances Vercel ; une protection partagée reste possible selon l'usage.
La base ne fournit pas à elle seule une protection contre le spam.

## Mode Surprise

`gift_read_owner_reservations` renvoie seulement `{"hidden":true}` tant que le mode
Surprise est actif et que `reservations_revealed_at` est vide. L'espace créateur ne
doit pas appeler la lecture publique pour enrichir sa réponse.
La révélation explicite renseigne `reservations_revealed_at` après l'avertissement UI.
Le créateur peut aussi désactiver le mode Surprise volontairement.

Le créateur peut consulter le lien public comme tout invité : la surprise est une
préférence de son espace personnel, pas une garantie de secret vis-à-vis d'une
personne qui possède le lien de partage.

## Vérification locale

Commande : `node --import tsx --test tests/gift-lists.test.ts`.

Cinq scénarios passent avec PostgreSQL embarqué PGlite : permissions et isolation,
projection publique sans données privées, mode Surprise et révélation,
idempotence et refus des doubles réservations, montants et annulations, contraintes
et suppressions en cascade. Les rôles `anon`, `authenticated` et `service_role`
sont exercés réellement dans ces tests.

Ces tests PostgreSQL embarqués sont complétés par le test HTTP/Supabase réel
décrit plus bas, y compris les requêtes concurrentes. La connexion Google auprès
du fournisseur externe n'est pas automatisée par ces tests.

Documentation consultée : [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Étape 2 : extraction des informations produit

Endpoint : `POST /api/tetris/gifts/extract`, avec JSON `{"url":"https://boutique.fr/produit"}`.
Le chemin réutilise le périmètre du cookie Google existant : aucune migration de
session, nouvelle variable ou nouvelle requête SQL n'est nécessaire pour l'extraction.
La route exige une session Google vérifiée et une origine identique au site.

Réponse : `status` (`success`, `partial` ou `manual`), `title`, `image_url`, `price`,
`currency`, `manual_entry` et `message`. Les informations absentes valent `null`.
Les champs de formulaire devront toujours rester modifiables, même après un succès.
Une panne, un blocage marchand ou l'absence de métadonnées permet la saisie manuelle.
Le serveur ne retourne jamais le HTML du marchand ni ses erreurs techniques.
Les prix explicitement libellés dans une autre devise que l'euro ne remplissent
pas le prix en euros : `price` vaut alors `null` et `currency` conserve la devise.
Un prix dont la devise est absente reste une estimation à vérifier dans le formulaire.

Codes : 400 pour URL invalide ou destination interdite, 401 pour compte non connecté,
403 pour origine refusée, 413 pour JSON trop volumineux, 415 pour format non JSON,
429 pour budget atteint, 503 pour indisponibilité du contrôle de session.
Un marchand inaccessible retourne 200 avec `status: "manual"`.

La requête sortante est limitée à 8 secondes au total, 3 redirections et 1 Mio de HTML
décompressé. Les réponses gzip, deflate et Brotli sont prises en charge. Chaque
destination doit avoir exclusivement des adresses DNS publiques, et la connexion
est épinglée à l'adresse vérifiée pour empêcher une seconde résolution DNS différente.
Les IP littérales, ports non standard, identifiants dans l'URL, réseaux privés ou
spéciaux et redirections HTTPS vers HTTP sont refusés. Aucun cookie utilisateur,
jeton ou en-tête d'authentification n'est envoyé à la boutique. Les scripts ne sont
pas exécutés ; les boutiques qui ne fournissent les données qu'après JavaScript
restent en saisie manuelle. Les métadonnées OpenGraph, Twitter, prix microdata et
la balise `title` sont reconnues. Aucun navigateur automatisé ni contournement de
CAPTCHA n'est utilisé.

Les images sont seulement extraites comme URL HTTP(S), jamais téléchargées par cet
endpoint. L’interface conserve `referrerPolicy="no-referrer"` et ne
passe pas une URL arbitraire à un proxy d'image serveur sans contrôle réseau équivalent.
La validation IPv6 est volontairement conservatrice : certaines boutiques ne
répondant que sur des plages spéciales peuvent nécessiter une saisie manuelle.

Budget mémoire par instance : 10 extractions par compte et par minute, une à la
fois par compte et quatre simultanées au maximum. Ce n'est pas une protection
distribuée entre plusieurs instances Vercel ; une limitation partagée pourra être
ajoutée si l'usage le nécessite. Les réponses sont privées et non mises en cache.

Tests : `node --import tsx --test tests/gift-product-metadata.test.ts`.
Neuf scénarios vérifient extraction, décodage, prix, adresses interdites, épinglage
DNS, redirections, délais, décompression bornée, session, origine, erreurs et budget.
Les pages marchandes et sessions Google sont simulées ; ces tests ne certifient
pas l'accessibilité d'une boutique particulière ou la configuration Google distante.
Le contrôle TypeScript et le lint des fichiers d'extraction passent. Un appel
direct au véritable export de route confirme le refus HTTP 403 sans origine.
La compilation de production a depuis été validée lors de l'intégration des écrans.

Références : [requêtes HTTP Node.js](https://nodejs.org/api/http.html#httprequestoptions-callback),
[résolution DNS Node.js](https://nodejs.org/api/dns.html#dnslookuphostname-options-callback).

## Écrans et parcours livrés

- `/outils/listes-cadeaux` : listes personnelles, connexion Google partagée,
  création avec occasion, description, instructions et mode Surprise.
- `/outils/listes-cadeaux/[id]` : ajout manuel ou extraction produit, édition et
  suppression des cadeaux, coups de cœur, partage et QR code, réglages de liste,
  réservations et messages privés, révélation confirmée, suppression de liste.
- `/l/[slug]` : liste invitée sans compte, noms des participants, réservation
  simple, jauge des participations déclarées, instructions et liens marchands.
- `/listes/[slug]` : alias vers le lien court.
- `/listes/annuler#<secret>` : confirmation explicite d'annulation ; aucun GET ne
  modifie la réservation. Le fragment est retiré de l'adresse après ouverture.

Les chemins suivent le routage des locales existantes. Cette première version de
l'outil est rédigée en français (langue explicitement indiquée dans son interface) ;
les contenus de listes restent ceux saisis par les utilisateurs. Les traductions
complètes des nouveaux textes ne sont pas encore fournies.

Le dashboard et le détail actualisent les données toutes les 10 à 15 secondes,
et la liste invitée toutes les 15 secondes. Il ne s'agit pas de WebSockets.
Les liens et les images sont affichés sans referrer et sans proxy d'image serveur.

Les réservations en attente conservent leurs informations et leur secret dans
sessionStorage avant l'envoi. Après une réponse perdue, le formulaire se verrouille
sur ces informations et propose une reprise après rechargement. Une confirmation
réussie enregistre le lien d'annulation localement ; si cet enregistrement échoue,
le lien reste disponible à copier. Ces données navigateur ne sont pas synchronisées
entre appareils. Les comptes créateurs, eux, retrouvent leurs listes via Supabase.

Les pages de listes excluent le montage des outils analytics, y compris lorsque le
consentement est accepté. L'entrée depuis Outils recharge le document ; une garde
force aussi un rechargement avant d'afficher les données privées si une navigation
client arrive depuis une page ayant monté les outils analytics. Une CSP restreint
les connexions des documents de listes à la même origine (WebSocket de dev excepté).
Le reste du portfolio conserve son instrumentation.

## Validation finale de l'intégration

- `node --import tsx --test tests/gift-lists.test.ts tests/gift-product-metadata.test.ts tests/gift-api.test.ts` :
  16 tests locaux passent ; le test distant est ignoré sans son opt-in.
- `GIFT_LISTS_LIVE_TEST=1 node --import tsx --test tests/gift-api.test.ts` :
  validation locale et parcours réel HTTP → Supabase réussis. Deux requêtes
  simultanées ne peuvent ni réserver deux fois le même cadeau ni dépasser le prix
  cible d'une participation. Propriété, projection publique, surprise, révélation,
  retries, annulation répétée, suppression et cascades sont vérifiés.
- `GIFT_LISTS_LIVE_TEST=1 npx playwright test tests/gift-lists-responsive.spec.ts --project=chromium --project=webkit-iphone` :
  6 parcours passent, couvrant création, extraction simulée, ajout, partage,
  réservation, message caché puis révélé, participation, annulation, suppression,
  réponse perdue puis reprise sans doublon, connexion requise et liste inexistante.
  Aucun événement de collecte analytics n'est émis depuis les pages de listes.
  Captures desktop et mobile relues ; aucun débordement sur le mobile testé.
- `npm run typecheck`, lint ciblé des fichiers modifiés et `npm run build` : réussis.
  Le build signale seulement le warning existant de police Google Sans.
- `npm run lint` global : 12 erreurs et 8 avertissements dans des fichiers non
  modifiés (playground, backoffice, design system, cartes et jeux). Le nouveau code
  passe le lint ciblé.
- `git diff --check` : réussi.

Les tests distants utilisent des comptes Supabase temporaires créés via l'API
administrative, avec une identité de test représentant le contrat du compte Google
partagé. Ils n'envoient aucun email et ne connectent pas un vrai compte Google via
OAuth. Les comptes sont supprimés en fin de scénario ; une requête finale a confirmé
zéro compte temporaire restant. Les données de listes associées sont supprimées en
cascade. Le secret serveur ne figure dans aucun résultat de test.

Les tests Safari sont exécutés avec WebKit sur Mac et un profil iPhone, pas sur un
iPhone physique. Aucun déploiement n'a été lancé pendant cette intégration.

## Ajustements de hiérarchie et de design system

- Accent réservé aux boutons d'entrée « Créer une liste » et « Ajouter un cadeau ».
  Les validations des formulaires, les réservations, les participations et le partage
  générique utilisent Primary. WhatsApp et iMessage utilisent Secondary.
  Liens, jauges et tags utilisent les tokens neutres.
- Le bouton de création d'en-tête est absent à l'état vide : seul le bouton
  « Créer ma première liste » est affiché.
- Les occasions sont présentées en tags secondaires. « Autre occasion » affiche
  un champ libre facultatif, masqué pour les occasions prédéfinies. Le libellé
  est enregistré dans `gift_lists.occasion_label`, limité à 80 caractères, et
  exposé avec la liste publique par l'API. Aucun changement des permissions de
  la fonction publique n'a été nécessaire.
- Le menu Select partagé est placé au-dessus des fenêtres de dialogue afin de
  rendre les occasions sélectionnables dans la modale.
- Le titre et la description précèdent les cadeaux. Les accroches décoratives et
  les explications répétées sont retirées. « Coup de cœur » est un tag près du
  prix, après le nom du cadeau.
- La suppression de la liste se trouve dans ses réglages, sur la même ligne que
  Annuler/Enregistrer, et conserve une confirmation.
- Les liens d'annulation sont regroupés dans l’accordéon du design system
  « Mes réservations », replié par défaut, avec compteur et lignes séparées.
- L’en-tête invité rapproche le titre, le tag et la description, sans séparateur.
- Le lien d'entrée vers la création personnelle est centré en pied de page :
  « À mon tour de créer une liste ». Le formulaire s'ouvre directement après
  authentification via le paramètre `creer=1`.
- La confirmation d'une réservation utilise le toast du design system en haut à
  droite, refermable et masqué automatiquement après cinq secondes.
- Un bouton « Partager sur WhatsApp » est placé en bas des vues créateur et invité.
  Il ouvre un message prérempli avec le titre et le lien court de la liste ; rien
  n'est envoyé automatiquement. La création d'un groupe se fait dans WhatsApp.
  [Documentation WhatsApp](https://faq.whatsapp.com/5913398998672934).

Les tests navigateur couvrent aussi le champ conditionnel, la sauvegarde et
l'affichage du tag libre, les variantes Primary/Accent, l'absence du doublon de
création à l'état vide et le contenu du lien WhatsApp (sans envoi de message).

## Image de liste et partage Messages

Une image facultative peut être importée, remplacée ou retirée à la création et
à l'édition d'une liste. Les formats JPEG, PNG et WebP de moins de 5 Mo sont
préparés par la fonction photo commune (sa taille par défaut de profil reste
inchangée). L'image de liste utilise une dimension de préparation de 960 px.
Le serveur vérifie le format réel, limite les pixels décodés et réencode l'image
en WebP de 960 × 640 px maximum, sans métadonnées, dans une limite de 180 Ko.

Cette petite image est enregistrée dans `gift_lists.cover_image` sous forme de
Data URL bornée à 250 000 caractères, puis affichée dans les listes personnelles,
le détail créateur et la vue invitée. Aucun bucket ni nouveau droit de stockage
n'a été créé. La colonne facultative préserve les listes existantes.
Les requêtes de gestion de liste acceptent au maximum 270 Ko ; les réservations
publiques conservent leur limite de 20 Ko.

« Partager par iMessage » figure à côté de WhatsApp et ouvre la feuille de partage
native : l'utilisateur choisit Messages. Si ce partage natif est absent, le texte
et le lien sont copiés, puis le schéma `sms:` ouvre l'application Messages pour les
coller. Aucun message n'est envoyé automatiquement et aucun destinataire n'est
choisi par le site. L'envoi utilise iMessage ou SMS selon l'appareil et le destinataire.
[Référence Apple sur les liens Messages](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html).

Les tests vérifient le réencodage et le retrait des métadonnées, le refus des faux
formats et images trop volumineuses, l'import dans le formulaire, la persistance
et l'affichage côté invité, ainsi que les données transmises au partage natif.
L'application Messages elle-même et l'envoi iMessage ne sont pas automatisés.

Le bloc de partage ne présente plus de séparateur. « Partager » apparaît en
premier en Primary : il ouvre le partage natif, ou copie le lien si celui-ci est
indisponible. WhatsApp et iMessage suivent en Secondary.
